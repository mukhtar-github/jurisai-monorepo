"""
Fine-tuning implementation for legal domain language models.

This module implements the functionality for fine-tuning transformer models
on legal datasets to improve their performance on domain-specific tasks.
"""
import logging
import os
import json
from typing import List, Dict, Any, Optional, Union, Tuple
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoModelForCausalLM,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
    DataCollatorForSeq2Seq,
    DataCollatorForLanguageModeling
)
from datasets import load_dataset, Dataset as HFDataset

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LegalDataset(Dataset):
    """Custom dataset for legal documents and annotations."""
    
    def __init__(
        self,
        texts: List[str],
        labels: Optional[List[str]] = None,
        tokenizer=None,
        max_length: int = 512,
        task_type: str = "summarization"
    ):
        """
        Initialize the legal dataset.
        
        Args:
            texts: List of input texts (documents or passages)
            labels: List of target texts or labels
            tokenizer: The tokenizer to use for encoding
            max_length: Maximum sequence length
            task_type: Type of task (summarization, qa, classification)
        """
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.task_type = task_type
        
    def __len__(self):
        return len(self.texts)
        
    def __getitem__(self, idx):
        text = self.texts[idx]
        
        if self.tokenizer:
            if self.task_type == "summarization" and self.labels:
                # For summarization, we need both input and output
                inputs = self.tokenizer(
                    text, 
                    max_length=self.max_length,
                    padding="max_length",
                    truncation=True,
                    return_tensors="pt"
                )
                
                with self.tokenizer.as_target_tokenizer():
                    labels = self.tokenizer(
                        self.labels[idx],
                        max_length=self.max_length,
                        padding="max_length",
                        truncation=True,
                        return_tensors="pt"
                    )
                
                return {
                    "input_ids": inputs.input_ids.squeeze(),
                    "attention_mask": inputs.attention_mask.squeeze(),
                    "labels": labels.input_ids.squeeze()
                }
            
            elif self.task_type == "qa" and self.labels:
                # For QA, similar to summarization but with different structuring
                return self.tokenizer(
                    text,
                    text_pair=self.labels[idx],
                    max_length=self.max_length,
                    padding="max_length",
                    truncation=True,
                    return_tensors="pt"
                )
            
            elif self.task_type == "classification" and self.labels:
                # For classification, return input encodings and label
                encodings = self.tokenizer(
                    text,
                    max_length=self.max_length,
                    padding="max_length",
                    truncation=True,
                    return_tensors="pt"
                )
                return {
                    **{k: v.squeeze() for k, v in encodings.items()},
                    "labels": torch.tensor(int(self.labels[idx]))
                }
            
            else:
                # Generic tokenization for other tasks
                return self.tokenizer(
                    text,
                    max_length=self.max_length,
                    padding="max_length",
                    truncation=True,
                    return_tensors="pt"
                )
        
        # If no tokenizer, just return raw text and label
        item = {"text": text}
        if self.labels:
            item["label"] = self.labels[idx]
        return item

class LegalModelFineTuner:
    """
    Fine-tuner for legal domain language models.
    
    This class provides methods for fine-tuning transformer models
    on legal datasets for various tasks like summarization, QA, etc.
    """
    
    def __init__(
        self,
        model_name: str,
        task_type: str = "summarization",
        output_dir: str = "./finetuned_model",
        device: Optional[str] = None
    ):
        """
        Initialize the fine-tuner.
        
        Args:
            model_name: Base model name from HuggingFace
            task_type: Task type (summarization, qa, classification)
            output_dir: Directory to save fine-tuned model
            device: Device to use for training (cpu, cuda)
        """
        self.model_name = model_name
        self.task_type = task_type
        self.output_dir = output_dir
        
        # Determine device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        logger.info(f"Initializing fine-tuner for {model_name} on {self.device} for {task_type}")
        
        # Initialize tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Initialize model based on task type
        if task_type == "summarization":
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        else:
            self.model = AutoModelForCausalLM.from_pretrained(model_name)
            
        # Move model to device
        self.model.to(self.device)
        
    def prepare_legal_dataset(
        self,
        data_path: str,
        split: str = "train",
        text_field: str = "text",
        label_field: Optional[str] = "summary"
    ) -> Union[Dataset, HFDataset]:
        """
        Prepare a dataset for fine-tuning from local files or HuggingFace datasets.
        
        Args:
            data_path: Path to data (local file or HF dataset name)
            split: Dataset split to use
            text_field: Field name for input text
            label_field: Field name for labels/targets
            
        Returns:
            Dataset ready for fine-tuning
        """
        # Check if it's a local file
        if os.path.exists(data_path):
            logger.info(f"Loading local dataset from {data_path}")
            
            # Load based on file extension
            if data_path.endswith(".json") or data_path.endswith(".jsonl"):
                with open(data_path, "r") as f:
                    if data_path.endswith(".json"):
                        data = json.load(f)
                    else:
                        data = [json.loads(line) for line in f]
                
                # Extract texts and labels
                texts = [item.get(text_field, "") for item in data]
                labels = [item.get(label_field, "") for item in data] if label_field else None
                
                return LegalDataset(
                    texts=texts,
                    labels=labels,
                    tokenizer=self.tokenizer,
                    task_type=self.task_type
                )
            
            else:
                raise ValueError(f"Unsupported file format: {data_path}")
        
        # Otherwise, try to load as a HuggingFace dataset
        else:
            logger.info(f"Loading HuggingFace dataset: {data_path}")
            dataset = load_dataset(data_path, split=split)
            
            # Convert to expected format
            if label_field and label_field in dataset.features:
                return LegalDataset(
                    texts=dataset[text_field],
                    labels=dataset[label_field],
                    tokenizer=self.tokenizer,
                    task_type=self.task_type
                )
            else:
                return LegalDataset(
                    texts=dataset[text_field],
                    tokenizer=self.tokenizer,
                    task_type=self.task_type
                )
    
    def finetune(
        self,
        train_dataset: Union[Dataset, HFDataset],
        validation_dataset: Optional[Union[Dataset, HFDataset]] = None,
        num_train_epochs: int = 3,
        batch_size: int = 8,
        learning_rate: float = 5e-5,
        weight_decay: float = 0.01,
        save_steps: int = 500,
        eval_steps: int = 500
    ):
        """
        Fine-tune the model on the provided dataset.
        
        Args:
            train_dataset: Training dataset
            validation_dataset: Validation dataset
            num_train_epochs: Number of training epochs
            batch_size: Batch size for training
            learning_rate: Learning rate
            weight_decay: Weight decay
            save_steps: Steps between model checkpoints
            eval_steps: Steps between evaluations
        """
        logger.info(f"Starting fine-tuning for {self.model_name}")
        
        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Prepare training arguments
        training_args = TrainingArguments(
            output_dir=self.output_dir,
            num_train_epochs=num_train_epochs,
            per_device_train_batch_size=batch_size,
            per_device_eval_batch_size=batch_size,
            weight_decay=weight_decay,
            learning_rate=learning_rate,
            save_steps=save_steps,
            eval_steps=eval_steps if validation_dataset else None,
            evaluation_strategy="steps" if validation_dataset else "no",
            save_total_limit=2,
            load_best_model_at_end=True if validation_dataset else False,
            report_to="none",  # Disable reporting to avoid external dependencies
        )
        
        # Choose data collator based on task type
        if self.task_type == "summarization":
            data_collator = DataCollatorForSeq2Seq(
                tokenizer=self.tokenizer,
                model=self.model
            )
        else:
            data_collator = DataCollatorForLanguageModeling(
                tokenizer=self.tokenizer,
                mlm=False
            )
        
        # Create trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=validation_dataset,
            data_collator=data_collator,
        )
        
        # Start training
        logger.info("Training started...")
        trainer.train()
        logger.info("Training complete!")
        
        # Save model and tokenizer
        logger.info(f"Saving fine-tuned model to {self.output_dir}")
        self.model.save_pretrained(self.output_dir)
        self.tokenizer.save_pretrained(self.output_dir)
        
    def evaluate(
        self,
        test_dataset: Union[Dataset, HFDataset],
        metric_name: str = "rouge"
    ) -> Dict[str, float]:
        """
        Evaluate the fine-tuned model on a test dataset.
        
        Args:
            test_dataset: Test dataset
            metric_name: Metric to use for evaluation
            
        Returns:
            Dictionary of evaluation metrics
        """
        logger.info(f"Evaluating model with {metric_name} metric")
        
        try:
            from datasets import load_metric
            metric = load_metric(metric_name)
        except Exception as e:
            logger.error(f"Failed to load metric {metric_name}: {e}")
            return {"error": 1.0}
        
        # Create trainer for evaluation
        trainer = Trainer(
            model=self.model,
            args=TrainingArguments(
                output_dir=self.output_dir,
                per_device_eval_batch_size=8,
                report_to="none"
            ),
            eval_dataset=test_dataset,
        )
        
        # Run evaluation
        results = trainer.evaluate()
        logger.info(f"Evaluation results: {results}")
        return results
