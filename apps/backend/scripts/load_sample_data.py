"""
Script to load sample Nigerian legal documents into the JurisAI database.
This is used for testing and demonstration purposes.
"""
import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add the parent directory to sys.path to import from src
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Set TEST_MODE to true to use SQLite instead of PostgreSQL
os.environ["TEST_MODE"] = "true"

from sqlalchemy.orm import Session
from src.core.database import SessionLocal, engine, Base
from src.models.document import LegalDocument, DocumentEntity, DocumentKeyTerm

# Sample document metadata
SAMPLE_DOCUMENTS = [
    {
        "title": "Constitution of the Federal Republic of Nigeria",
        "document_type": "constitution",
        "jurisdiction": "Nigeria",
        "publication_date": "1999-05-29",
        "metadata": {
            "author": "Federal Government of Nigeria",
            "version": "1999 (as amended)",
            "chapters": 8,
            "sections": 320
        },
        "file_name": "constitution.txt"
    },
    {
        "title": "Companies and Allied Matters Act",
        "document_type": "statute",
        "jurisdiction": "Nigeria",
        "publication_date": "2020-08-07",
        "metadata": {
            "author": "National Assembly of Nigeria",
            "citation": "CAMA 2020",
            "chapters": 25,
            "sections": 870
        },
        "file_name": "cama.txt"
    },
    {
        "title": "Evidence Act",
        "document_type": "statute",
        "jurisdiction": "Nigeria",
        "publication_date": "2011-06-03",
        "metadata": {
            "author": "National Assembly of Nigeria",
            "citation": "Evidence Act 2011",
            "parts": 12,
            "sections": 259
        },
        "file_name": "evidence_act.txt"
    },
    {
        "title": "Dangote Industries Ltd v. Zenith Bank Plc",
        "document_type": "case_law",
        "jurisdiction": "Nigeria",
        "publication_date": "2023-07-15",
        "metadata": {
            "court": "Supreme Court of Nigeria",
            "judges": ["Justice Ibrahim Tanko Muhammad", "Justice Mary Odili", "Justice Olukayode Ariwoola"],
            "citation": "[2023] NGSC 142",
            "parties": ["Dangote Industries Ltd", "Zenith Bank Plc"]
        },
        "file_name": "dangote_v_zenith.txt"
    },
    {
        "title": "Federal Government of Nigeria v. Shell Petroleum Development Company",
        "document_type": "case_law",
        "jurisdiction": "Nigeria",
        "publication_date": "2022-11-23",
        "metadata": {
            "court": "Federal High Court",
            "judge": "Justice Ahmed Mohammed",
            "citation": "[2022] FHC/ABJ/CS/54/2022",
            "parties": ["Federal Government of Nigeria", "Shell Petroleum Development Company"]
        },
        "file_name": "fg_v_shell.txt"
    }
]

def create_sample_document_files():
    """Create sample document files with content."""
    sample_data_dir = Path(__file__).resolve().parent.parent / "sample_data"
    os.makedirs(sample_data_dir, exist_ok=True)
    
    # Sample content for Constitution
    constitution_content = """CONSTITUTION OF THE FEDERAL REPUBLIC OF NIGERIA 1999

ARRANGEMENT OF SECTIONS

Chapter I - General Provisions

PART I - Federal Republic of Nigeria

1. Supremacy of the constitution.
2. The Federal Republic of Nigeria.
3. States of the Federation and the Federal Capital Territory, Abuja.

PART II - Powers of the Federal Republic of Nigeria

4. Legislative powers.
5. Executive powers.
6. Judicial powers.
7. Local government system.
8. New states and boundary adjustment, etc.
9. Mode of altering provisions of the constitution.

Chapter II - Fundamental Objectives and Directive Principles of State Policy

10. Nigerian Government based on principles of democracy and social justice.
11. Political objectives.
12. Economic objectives.
13. Social objectives.
14. Educational objectives.
15. Foreign policy objectives.
16. Environmental objectives.
17. Cultural objectives.
18. Mass media freedom and responsibility objectives.
19. National ethics.
20. Duties of citizens.
"""

    # Sample content for CAMA
    cama_content = """COMPANIES AND ALLIED MATTERS ACT, 2020

An Act to repeal the Companies and Allied Matters Act, Cap. C20, Laws of the Federation of Nigeria, 2004 and enact the Companies and Allied Matters Act, 2020 to provide for the incorporation of companies, limited liability partnerships, registration of business names together with incorporation of trustees of certain communities, bodies or associations.

PART A - COMPANIES

CHAPTER 1 - GENERAL PROVISIONS

1. This Act may be cited as the Companies and Allied Matters Act, 2020.

2. In this Act—
"affairs" means the affairs of a company or association;
"alien" means a person or association, whether corporate or unincorporated, other than a Nigerian citizen or association;
"annual return" means the return required to be made, in the case of a company having a share capital, under section 417 of this Act, and in the case of a company not having a share capital, under section 418 of this Act;
"approved auditor" means an auditor appointed in a manner prescribed under section 401 of this Act;
"""

    # Sample content for Evidence Act
    evidence_act_content = """EVIDENCE ACT, 2011

ARRANGEMENT OF SECTIONS

PART I - GENERAL

1. Short title.
2. Application.
3. Interpretation.

PART II - RELEVANCY

4. Evidence may be given of facts in issue and relevant facts.
5. Relevancy of facts forming part of same transaction.
6. Facts which are the occasion, cause or effect of facts in issue.
7. Motive, preparation and previous or subsequent conduct.
8. Facts necessary to explain or introduce relevant facts.
"""

    # Sample content for court case
    dangote_case_content = """IN THE SUPREME COURT OF NIGERIA
HOLDEN AT ABUJA
ON FRIDAY, THE 15TH DAY OF JULY, 2023
BEFORE THEIR LORDSHIPS
IBRAHIM TANKO MUHAMMAD, CJN
MARY UKAEGO PETER-ODILI, JSC
OLUKAYODE ARIWOOLA, JSC

SC.142/2023

BETWEEN:
DANGOTE INDUSTRIES LTD             ...APPELLANT

AND

ZENITH BANK PLC                    ...RESPONDENT

JUDGMENT
(Delivered by OLUKAYODE ARIWOOLA, JSC)

This is an appeal against the judgment of the Court of Appeal, Lagos Division, delivered on the 23rd day of January, 2023 which dismissed the appellant's appeal against the judgment of the Federal High Court, Lagos delivered on the 15th day of May, 2022.

The facts of this case are straightforward. The appellant, a conglomerate with diverse business interests, maintained several accounts with the respondent bank. A dispute arose concerning alleged unauthorized charges and deductions from the appellant's accounts between January 2018 and December 2021.
"""

    # Sample content for another court case
    shell_case_content = """IN THE FEDERAL HIGH COURT
HOLDEN AT ABUJA
ON WEDNESDAY, THE 23RD DAY OF NOVEMBER, 2022

SUIT NO: FHC/ABJ/CS/54/2022

BETWEEN:
FEDERAL GOVERNMENT OF NIGERIA      ...PLAINTIFF

AND

SHELL PETROLEUM DEVELOPMENT
COMPANY OF NIGERIA LIMITED         ...DEFENDANT

JUDGMENT
(Delivered by AHMED MOHAMMED, J)

This action was instituted by the Federal Government of Nigeria against Shell Petroleum Development Company, seeking declarations relating to environmental damage in the Niger Delta region, specifically concerning oil spills that occurred between 2018 and 2020.

The plaintiff's case is that the defendant, as an operator of several oil wells and pipelines in the Niger Delta region, has failed to properly maintain its facilities, resulting in numerous oil spills that have caused environmental degradation, loss of livelihood for local communities, and pollution of water sources.
"""

    # Write content to files
    file_mapping = {
        "constitution.txt": constitution_content,
        "cama.txt": cama_content,
        "evidence_act.txt": evidence_act_content,
        "dangote_v_zenith.txt": dangote_case_content,
        "fg_v_shell.txt": shell_case_content
    }
    
    for filename, content in file_mapping.items():
        with open(sample_data_dir / filename, 'w') as f:
            f.write(content)
    
    print(f"Created sample document files in {sample_data_dir}")
    return sample_data_dir

def load_sample_documents(db: Session, sample_data_dir: Path):
    """Load sample documents into the database."""
    print("Loading sample documents into the database...")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    loaded_docs = []
    
    for doc_metadata in SAMPLE_DOCUMENTS:
        # Check if document already exists
        existing_doc = db.query(LegalDocument).filter(
            LegalDocument.title == doc_metadata["title"]
        ).first()
        
        if existing_doc:
            print(f"Document '{doc_metadata['title']}' already exists, skipping...")
            continue
        
        # Read content from file
        with open(sample_data_dir / doc_metadata["file_name"], 'r') as f:
            content = f.read()
        
        # Parse publication date
        pub_date = None
        if doc_metadata.get("publication_date"):
            pub_date = datetime.strptime(doc_metadata["publication_date"], "%Y-%m-%d")
        
        # Create document record
        doc = LegalDocument(
            title=doc_metadata["title"],
            content=content,
            document_type=doc_metadata["document_type"],
            jurisdiction=doc_metadata["jurisdiction"],
            publication_date=pub_date,
            metadata=doc_metadata["metadata"],
            file_format="txt",
            word_count=len(content.split())
        )
        
        db.add(doc)
        db.flush()  # Get the ID without committing
        
        print(f"Added document: {doc.title} (ID: {doc.id})")
        loaded_docs.append(doc)
    
    db.commit()
    return loaded_docs

def add_sample_entities(db: Session, documents):
    """Add sample entities to the loaded documents."""
    print("Adding sample entities to documents...")
    
    # Sample entities by document type
    entity_samples = {
        "constitution": [
            {"entity_type": "institution", "entity_text": "Federal Republic of Nigeria", "relevance_score": 95},
            {"entity_type": "institution", "entity_text": "National Assembly", "relevance_score": 90},
            {"entity_type": "institution", "entity_text": "Supreme Court", "relevance_score": 88},
            {"entity_type": "legal_concept", "entity_text": "Fundamental Rights", "relevance_score": 85},
            {"entity_type": "legal_concept", "entity_text": "Judicial Powers", "relevance_score": 82},
        ],
        "statute": [
            {"entity_type": "legal_concept", "entity_text": "Corporate Personality", "relevance_score": 90},
            {"entity_type": "institution", "entity_text": "Corporate Affairs Commission", "relevance_score": 85},
            {"entity_type": "legal_concept", "entity_text": "Limited Liability", "relevance_score": 83},
            {"entity_type": "person", "entity_text": "Company Secretary", "relevance_score": 75},
            {"entity_type": "legal_concept", "entity_text": "Annual Returns", "relevance_score": 70},
        ],
        "case_law": [
            {"entity_type": "person", "entity_text": "Justice Ibrahim Tanko Muhammad", "relevance_score": 95},
            {"entity_type": "institution", "entity_text": "Supreme Court of Nigeria", "relevance_score": 90},
            {"entity_type": "legal_concept", "entity_text": "Judicial Precedent", "relevance_score": 85},
            {"entity_type": "institution", "entity_text": "Federal High Court", "relevance_score": 80},
            {"entity_type": "legal_concept", "entity_text": "Burden of Proof", "relevance_score": 75},
        ]
    }
    
    for doc in documents:
        # Get entities based on document type
        entities = entity_samples.get(doc.document_type, [])
        
        for entity in entities:
            entity_record = DocumentEntity(
                document_id=doc.id,
                entity_text=entity["entity_text"],
                entity_type=entity["entity_type"]
            )
            db.add(entity_record)
        
    db.commit()
    print("Sample entities added")

def add_sample_key_terms(db: Session, documents):
    """Add sample key terms to the loaded documents."""
    print("Adding sample key terms to documents...")
    
    # Sample key terms by document type
    key_term_samples = {
        "constitution": [
            {"term": "democracy", "frequency": 15, "relevance_score": 90},
            {"term": "fundamental rights", "frequency": 25, "relevance_score": 95},
            {"term": "separation of powers", "frequency": 12, "relevance_score": 88},
            {"term": "judicial review", "frequency": 8, "relevance_score": 85},
            {"term": "federalism", "frequency": 18, "relevance_score": 92},
        ],
        "statute": [
            {"term": "incorporation", "frequency": 30, "relevance_score": 95},
            {"term": "shares", "frequency": 45, "relevance_score": 90},
            {"term": "directors", "frequency": 37, "relevance_score": 88},
            {"term": "liability", "frequency": 28, "relevance_score": 85},
            {"term": "dissolution", "frequency": 15, "relevance_score": 80},
        ],
        "case_law": [
            {"term": "precedent", "frequency": 12, "relevance_score": 90},
            {"term": "judgment", "frequency": 35, "relevance_score": 95},
            {"term": "appeal", "frequency": 28, "relevance_score": 88},
            {"term": "evidence", "frequency": 40, "relevance_score": 92},
            {"term": "damages", "frequency": 22, "relevance_score": 85},
        ]
    }
    
    for doc in documents:
        # Get key terms based on document type
        key_terms = key_term_samples.get(doc.document_type, [])
        
        for term in key_terms:
            key_term_record = DocumentKeyTerm(
                document_id=doc.id,
                term=term["term"],
                frequency=term["frequency"],
                relevance_score=term["relevance_score"]
            )
            db.add(key_term_record)
        
    db.commit()
    print("Sample key terms added")

def main():
    """Main function to create sample data and load it into the database."""
    print("Creating and loading sample data for JurisAI...")
    
    # Create sample document files
    sample_data_dir = create_sample_document_files()
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Load documents
        loaded_docs = load_sample_documents(db, sample_data_dir)
        
        if loaded_docs:
            # Add entities and key terms
            add_sample_entities(db, loaded_docs)
            add_sample_key_terms(db, loaded_docs)
            
            print("\nSample data loaded successfully!")
            print(f"Added {len(loaded_docs)} documents with entities and key terms")
        else:
            print("\nNo new documents were added. Database might already contain sample data.")
            
    except Exception as e:
        print(f"Error loading sample data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
