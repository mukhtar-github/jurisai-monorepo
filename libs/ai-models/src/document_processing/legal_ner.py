"""
Enhanced Named Entity Recognition (NER) for legal documents.

This module provides specialized entity recognition capabilities
tailored for legal documents, including court names, legal citations,
case references, statutes, and legal parties.
"""
import logging
import re
import json
import os
from typing import List, Dict, Any, Optional, Tuple, Set, Union
import spacy
from spacy.tokens import Doc, Span
from spacy.language import Language
from spacy.pipeline import EntityRuler
import torch

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check for GPU availability for model inference
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

class LegalEntityRecognizer:
    """
    Enhanced entity recognition for legal documents.
    
    This class provides methods for identifying specialized legal entities
    within legal text using a combination of rule-based patterns and
    fine-tuned NER models.
    """
    
    LEGAL_ENTITY_TYPES = {
        "COURT": "Court or tribunal name",
        "JUDGE": "Judge or justice name",
        "CASE_NUMBER": "Case identification number",
        "CITATION": "Legal citation (case or statute)",
        "STATUTE": "Statutory reference",
        "DATE": "Relevant date",
        "PARTY": "Party to the case (person or organization)",
        "LEGAL_TERM": "Specialized legal terminology",
        "JURISDICTION": "Legal jurisdiction",
        "ATTORNEY": "Attorney or counsel",
        "MONEY": "Monetary amount",
        "PROCEDURAL_POSTURE": "Stage of legal proceedings",
        "PRECEDENT_CASE": "Previously decided case cited as precedent"
    }
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        use_rules: bool = True,
        use_patterns: bool = True
    ):
        """
        Initialize the legal entity recognizer.
        
        Args:
            model_path: Path to fine-tuned SpaCy model (if None, uses base model)
            use_rules: Whether to use rule-based entity recognition
            use_patterns: Whether to use regex pattern matching
        """
        self.use_rules = use_rules
        self.use_patterns = use_patterns
        
        # Load SpaCy model
        try:
            if model_path and os.path.exists(model_path):
                logger.info(f"Loading custom NER model from {model_path}")
                self.nlp = spacy.load(model_path)
            else:
                # Default to en_core_web_lg if available, otherwise en_core_web_sm
                try:
                    logger.info("Loading en_core_web_lg model")
                    self.nlp = spacy.load("en_core_web_lg")
                except:
                    logger.info("Falling back to en_core_web_sm model")
                    self.nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            logger.error(f"Failed to load SpaCy model: {e}")
            logger.info("Using blank English model")
            self.nlp = spacy.blank("en")
        
        # Add custom components
        if use_rules:
            self._add_rule_based_components()
            
        logger.info("Legal entity recognizer initialized")
    
    def _add_rule_based_components(self):
        """Add rule-based entity recognition components to the pipeline."""
        # First remove any existing entity rulers to avoid conflicts
        if "entity_ruler" in self.nlp.pipe_names:
            self.nlp.remove_pipe("entity_ruler")
            
        # Create and add entity ruler
        entity_ruler = self.nlp.add_pipe("entity_ruler", before="ner" if "ner" in self.nlp.pipe_names else None)
        
        # Add legal entity patterns
        patterns = []
        
        # Court patterns
        court_patterns = [
            {"label": "COURT", "pattern": [{"LOWER": {"IN": ["supreme", "district", "appellate", "federal", "circuit"]}}, 
                                           {"LOWER": "court"}]},
            {"label": "COURT", "pattern": [{"LOWER": {"IN": ["court", "tribunal"]}}, 
                                           {"LOWER": "of"}, 
                                           {"IS_TITLE": True}]},
            {"label": "COURT", "pattern": [{"LOWER": "the"}, 
                                           {"IS_TITLE": True}, 
                                           {"IS_TITLE": True, "OP": "?"}, 
                                           {"LOWER": {"IN": ["court", "tribunal"]}}]}
        ]
        patterns.extend(court_patterns)
        
        # Judge patterns
        judge_patterns = [
            {"label": "JUDGE", "pattern": [{"LOWER": {"IN": ["judge", "justice", "magistrate", "commissioner", "j.", "hon."]}}, 
                                           {"IS_TITLE": True, "OP": "+"}]},
            {"label": "JUDGE", "pattern": [{"LOWER": "the"}, 
                                           {"LOWER": {"IN": ["honorable", "hon."]}}, 
                                           {"IS_TITLE": True, "OP": "+"}]}
        ]
        patterns.extend(judge_patterns)
        
        # Citation patterns
        citation_patterns = [
            {"label": "CITATION", "pattern": [{"SHAPE": "dddd"}, {"TEXT": "U.S."}, {"TEXT": {"REGEX": "\\d+"}}]},
            {"label": "CITATION", "pattern": [{"SHAPE": "dddd"}, {"TEXT": "F."}, {"TEXT": {"IN": ["Supp.", "2d", "3d"]}}, {"TEXT": {"REGEX": "\\d+"}}]},
            {"label": "CITATION", "pattern": [{"TEXT": {"REGEX": "\\d+"}}, {"TEXT": {"IN": ["Cal.", "N.Y.", "Tex.", "Fla."]}}, 
                                             {"TEXT": {"REGEX": "\\d+"}}]}
        ]
        patterns.extend(citation_patterns)
        
        # Statute patterns
        statute_patterns = [
            {"label": "STATUTE", "pattern": [{"TEXT": {"REGEX": "\\d+"}}, {"TEXT": "U.S.C."}, {"TEXT": "§"}, 
                                             {"TEXT": {"REGEX": "\\d+"}}]},
            {"label": "STATUTE", "pattern": [{"LOWER": {"IN": ["section", "§"]}}, {"TEXT": {"REGEX": "\\d+(-\\d+)?"}}]},
            {"label": "STATUTE", "pattern": [{"LOWER": "article"}, {"TEXT": {"REGEX": "[IVXivx]+|\\d+"}}]}
        ]
        patterns.extend(statute_patterns)
        
        # Case number patterns
        case_num_patterns = [
            {"label": "CASE_NUMBER", "pattern": [{"LOWER": {"IN": ["case", "docket", "no.", "number", "case", "cv"]}}, 
                                                 {"TEXT": {"REGEX": "[A-Za-z0-9\\-\\.:]+"}}]},
            {"label": "CASE_NUMBER", "pattern": [{"TEXT": {"REGEX": "\\d{1,2}\\-[A-Za-z]{2}\\-\\d{3,5}"}}]},
            {"label": "CASE_NUMBER", "pattern": [{"TEXT": {"REGEX": "[A-Z]\\d{2}\\-[A-Za-z]{2}\\-\\d{3,5}"}}]}
        ]
        patterns.extend(case_num_patterns)
        
        # Party patterns
        party_patterns = [
            {"label": "PARTY", "pattern": [{"LOWER": {"IN": ["plaintiff", "defendant", "appellant", "appellee", "petitioner", "respondent"]}}, 
                                           {"TEXT": ","}, {"LOWER": {"IN": ["inc", "llc", "corp", "corporation", "company"]}}, 
                                           {"TEXT": {"IN": [".", ","]}, "OP": "?"}]},
            {"label": "PARTY", "pattern": [{"LOWER": {"IN": ["plaintiff", "defendant", "appellant", "appellee", "petitioner", "respondent"]}}, 
                                           {"IS_TITLE": True, "OP": "+"}]}
        ]
        patterns.extend(party_patterns)
        
        # Add patterns to the entity ruler
        entity_ruler.add_patterns(patterns)
        
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract legal entities from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            List of extracted entities with type, text, and position
        """
        if not text:
            logger.warning("Empty text provided for entity extraction")
            return []
            
        entities = []
        
        # Use SpaCy NER
        doc = self.nlp(text[:100000])  # Limit to 100k chars to avoid memory issues
        
        # Add entities from SpaCy NER
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
                "source": "spacy"
            })
            
        # Add pattern-based entities if enabled
        if self.use_patterns:
            pattern_entities = self._extract_pattern_entities(text)
            entities.extend(pattern_entities)
            
        # Remove duplicates while preserving order
        unique_entities = []
        seen = set()
        
        for entity in entities:
            key = (entity["text"], entity["type"], entity["start"])
            if key not in seen:
                seen.add(key)
                unique_entities.append(entity)
                
        return unique_entities
    
    def _extract_pattern_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities using regex patterns.
        
        Args:
            text: Text to analyze
            
        Returns:
            List of extracted entities with type, text, and position
        """
        entities = []
        
        # Legal entity patterns (regex)
        patterns = {
            "COURT": [
                r'(?i)(?:the\s+)?(?:united\s+states|u\.s\.|supreme|district|appellate|federal|circuit|international)\s+court(?:\s+of\s+\w+(?:\s+\w+)?)?',
                r'(?i)(?:the\s+)?\w+\s+(?:district|circuit|supreme)\s+court',
                r'(?i)court\s+of\s+\w+(?:\s+\w+)?'
            ],
            "JUDGE": [
                r'(?i)(?:judge|justice|magistrate|j\.|hon\.|honorable)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?',
                r'(?i)the\s+honorable\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?'
            ],
            "CASE_NUMBER": [
                r'(?i)(?:case|docket)\s+(?:no\.|number)\s*[:.]?\s*[A-Za-z0-9\-\.:]+',
                r'(?i)(?:cv|cr|ci|ca)\s*[\-:]?\s*\d{2}[\-:][A-Za-z]{2}[\-:]\d{3,5}',
                r'\d{1,2}[\-:][A-Za-z]{2}[\-:]\d{3,5}'
            ],
            "CITATION": [
                r'\d{1,3}\s+U\.S\.\s+\d{1,4}',
                r'\d{1,3}\s+S\.\s*Ct\.\s+\d{1,4}',
                r'\d{1,3}\s+F\.(?:3d|2d)?\s+\d{1,4}',
                r'\d{1,3}\s+[A-Za-z\.]+\s+\d{1,4}'  # State reporter citations
            ],
            "STATUTE": [
                r'(?i)\d+\s+U\.S\.C\.\s+[§s]\s*\d+[\w\-]*',
                r'(?i)(?:section|§)\s*\d+(?:\([a-z0-9]+\))?(?:\s+of\s+the\s+[A-Za-z\s]+)?',
                r'(?i)article\s+[IVXivx\d]+(?:\s+of\s+the\s+[A-Za-z\s]+)?'
            ],
            "DATE": [
                r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}',
                r'\d{1,2}/\d{1,2}/\d{2,4}',
                r'\d{4}-\d{2}-\d{2}'
            ],
            "LEGAL_TERM": [
                r'(?i)(?:prima\s+facie|habeas\s+corpus|sine\s+qua\s+non|res\s+judicata|stare\s+decisis|mens\s+rea|actus\s+reus|voir\s+dire)',
                r'(?i)(?:de\s+novo|in\s+camera|ex\s+parte|pro\s+se|amicus\s+curiae|pro\s+bono|modus\s+operandi)'
            ]
        }
        
        # Extract entities using patterns
        for entity_type, regex_patterns in patterns.items():
            for pattern in regex_patterns:
                for match in re.finditer(pattern, text):
                    entities.append({
                        "text": match.group(),
                        "type": entity_type,
                        "start": match.start(),
                        "end": match.end(),
                        "source": "pattern"
                    })
                    
        return entities
        
    def add_custom_rules(self, custom_patterns: List[Dict[str, Any]]):
        """
        Add custom entity recognition patterns.
        
        Args:
            custom_patterns: List of custom patterns in SpaCy format
                [{"label": "TYPE", "pattern": [{"LOWER": "text"}, ...]}]
        """
        if not self.use_rules:
            logger.warning("Rule-based recognition is disabled")
            return
            
        # Get or create entity ruler
        if "entity_ruler" not in self.nlp.pipe_names:
            entity_ruler = self.nlp.add_pipe("entity_ruler", before="ner" if "ner" in self.nlp.pipe_names else None)
        else:
            entity_ruler = self.nlp.get_pipe("entity_ruler")
            
        # Add custom patterns
        entity_ruler.add_patterns(custom_patterns)
        logger.info(f"Added {len(custom_patterns)} custom patterns")
        
    def create_training_data(
        self,
        texts: List[str],
        entities: List[List[Dict[str, Any]]],
        output_file: str
    ):
        """
        Create training data for fine-tuning NER models.
        
        Args:
            texts: List of text samples
            entities: List of entity lists for each text
            output_file: Path to save training data
        """
        training_data = []
        
        for i, (text, text_entities) in enumerate(zip(texts, entities)):
            # Convert entities to SpaCy training format
            ent_locations = []
            for ent in text_entities:
                ent_locations.append(
                    (ent["start"], ent["end"], ent["type"])
                )
                
            training_data.append({
                "text": text,
                "entities": ent_locations
            })
            
        # Save to file
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, "w") as f:
            json.dump(training_data, f, indent=2)
            
        logger.info(f"Saved {len(training_data)} training examples to {output_file}")
        
    @staticmethod
    def fine_tune_model(
        input_model: str,
        training_data_path: str,
        output_model_path: str,
        n_iter: int = 30
    ):
        """
        Fine-tune a SpaCy NER model on legal domain data.
        
        Args:
            input_model: Base model to start from
            training_data_path: Path to training data file
            output_model_path: Path to save fine-tuned model
            n_iter: Number of training iterations
        """
        try:
            import spacy
            from spacy.training import Example
            
            logger.info(f"Fine-tuning {input_model} model on legal entity data")
            
            # Load training data
            with open(training_data_path, "r") as f:
                training_data = json.load(f)
                
            # Load model
            nlp = spacy.load(input_model)
            
            # Disable other pipelines during training
            other_pipes = [pipe for pipe in nlp.pipe_names if pipe != "ner"]
            
            # Create training examples
            examples = []
            for item in training_data:
                text = item["text"]
                entities = item["entities"]
                doc = nlp.make_doc(text)
                
                # Add entities for this example
                ents = []
                for start, end, label in entities:
                    span = doc.char_span(start, end, label=label)
                    if span:
                        ents.append(span)
                
                doc_ents = spacy.training.offsets_to_biluo_tags(doc, entities)
                example = Example.from_dict(doc, {"entities": entities})
                examples.append(example)
                
            # Train model
            with nlp.disable_pipes(*other_pipes):
                optimizer = nlp.begin_training()
                for i in range(n_iter):
                    losses = {}
                    for example in examples:
                        nlp.update([example], drop=0.5, losses=losses)
                    logger.info(f"Iteration {i+1}/{n_iter}, Losses: {losses}")
                    
            # Save fine-tuned model
            os.makedirs(output_model_path, exist_ok=True)
            nlp.to_disk(output_model_path)
            logger.info(f"Saved fine-tuned model to {output_model_path}")
            
        except Exception as e:
            logger.error(f"Error during model fine-tuning: {e}")
            raise
