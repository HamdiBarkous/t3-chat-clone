import io
import logging
from typing import Dict, Any
import PyPDF2
import json
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)


class TextExtractionError(Exception):
    """Custom exception for text extraction errors"""
    pass


class TextExtractor:
    """Utility class for extracting text from various file types"""
    
    # Maximum content length (50k characters as per schema)
    MAX_CONTENT_LENGTH = 50_000
    
    @staticmethod
    def extract_text(file_content: bytes, filename: str, file_type: str) -> str:
        """Extract text from file content based on file type"""
        try:
            file_type = file_type.lower()
            
            if file_type == 'pdf':
                return TextExtractor._extract_pdf_text(file_content)
            elif file_type in ['txt', 'md', 'py', 'js', 'ts', 'jsx', 'tsx', 'java', 
                              'cpp', 'c', 'h', 'hpp', 'go', 'rs', 'php', 'rb', 
                              'swift', 'kt', 'scala', 'sh', 'sql', 'css', 'html']:
                return TextExtractor._extract_plain_text(file_content)
            elif file_type in ['json']:
                return TextExtractor._extract_json_text(file_content)
            elif file_type in ['xml']:
                return TextExtractor._extract_xml_text(file_content)
            elif file_type in ['csv']:
                return TextExtractor._extract_csv_text(file_content)
            elif file_type in ['yaml', 'yml']:
                return TextExtractor._extract_yaml_text(file_content)
            else:
                raise TextExtractionError(f"Unsupported file type: {file_type}")
                
        except Exception as e:
            logger.error(f"Error extracting text from {filename} ({file_type}): {e}")
            raise TextExtractionError(f"Failed to extract text: {str(e)}")
    
    @staticmethod
    def _extract_pdf_text(file_content: bytes) -> str:
        """Extract text from PDF content"""
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_content = []
            max_pages = 50  # Limit to avoid memory issues
            
            for page_num, page in enumerate(pdf_reader.pages[:max_pages]):
                try:
                    page_text = page.extract_text()
                    if page_text.strip():
                        text_content.append(f"--- Page {page_num + 1} ---\n{page_text}")
                    
                    # Check if we're approaching the character limit
                    current_length = len('\n\n'.join(text_content))
                    if current_length > TextExtractor.MAX_CONTENT_LENGTH * 0.8:
                        break
                        
                except Exception as e:
                    logger.warning(f"Error extracting page {page_num + 1}: {e}")
                    continue
            
            if not text_content:
                raise TextExtractionError("No text could be extracted from PDF")
            
            full_text = '\n\n'.join(text_content)
            return TextExtractor._truncate_text(full_text)
            
        except Exception as e:
            if isinstance(e, TextExtractionError):
                raise
            raise TextExtractionError(f"PDF extraction failed: {str(e)}")
    
    @staticmethod
    def _extract_plain_text(file_content: bytes) -> str:
        """Extract text from plain text files"""
        try:
            # Try different encodings
            encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    text = file_content.decode(encoding)
                    return TextExtractor._truncate_text(text)
                except UnicodeDecodeError:
                    continue
            
            raise TextExtractionError("Could not decode text file with any supported encoding")
            
        except Exception as e:
            if isinstance(e, TextExtractionError):
                raise
            raise TextExtractionError(f"Plain text extraction failed: {str(e)}")
    
    @staticmethod
    def _extract_json_text(file_content: bytes) -> str:
        """Extract text from JSON files"""
        try:
            text = file_content.decode('utf-8')
            
            # Validate JSON and pretty format it
            try:
                json_data = json.loads(text)
                formatted_json = json.dumps(json_data, indent=2, ensure_ascii=False)
                return TextExtractor._truncate_text(formatted_json)
            except json.JSONDecodeError:
                # If not valid JSON, treat as plain text
                return TextExtractor._truncate_text(text)
                
        except Exception as e:
            raise TextExtractionError(f"JSON extraction failed: {str(e)}")
    
    @staticmethod
    def _extract_xml_text(file_content: bytes) -> str:
        """Extract text from XML files"""
        try:
            text = file_content.decode('utf-8')
            
            # Try to parse and format XML
            try:
                root = ET.fromstring(text)
                # Extract all text content from XML
                all_text = []
                
                def extract_element_text(element, level=0):
                    indent = "  " * level
                    if element.text and element.text.strip():
                        all_text.append(f"{indent}{element.tag}: {element.text.strip()}")
                    
                    for child in element:
                        extract_element_text(child, level + 1)
                
                extract_element_text(root)
                
                if all_text:
                    formatted_text = '\n'.join(all_text)
                else:
                    formatted_text = text  # Fallback to raw XML
                    
                return TextExtractor._truncate_text(formatted_text)
                
            except ET.ParseError:
                # If not valid XML, treat as plain text
                return TextExtractor._truncate_text(text)
                
        except Exception as e:
            raise TextExtractionError(f"XML extraction failed: {str(e)}")
    
    @staticmethod
    def _extract_csv_text(file_content: bytes) -> str:
        """Extract text from CSV files"""
        try:
            text = file_content.decode('utf-8')
            # For CSV, we'll just return the raw content
            # Could enhance with pandas for proper CSV parsing
            return TextExtractor._truncate_text(text)
            
        except Exception as e:
            raise TextExtractionError(f"CSV extraction failed: {str(e)}")
    
    @staticmethod
    def _extract_yaml_text(file_content: bytes) -> str:
        """Extract text from YAML files"""
        try:
            text = file_content.decode('utf-8')
            # For YAML, return raw content (could enhance with yaml library)
            return TextExtractor._truncate_text(text)
            
        except Exception as e:
            raise TextExtractionError(f"YAML extraction failed: {str(e)}")
    
    @staticmethod
    def _truncate_text(text: str) -> str:
        """Truncate text to maximum allowed length"""
        if len(text) <= TextExtractor.MAX_CONTENT_LENGTH:
            return text
        
        # Truncate and add indication
        truncated = text[:TextExtractor.MAX_CONTENT_LENGTH - 100]
        
        # Try to truncate at a word boundary
        last_space = truncated.rfind(' ')
        if last_space > TextExtractor.MAX_CONTENT_LENGTH - 200:
            truncated = truncated[:last_space]
        
        truncated += f"\n\n... [Content truncated - showing first {len(truncated)} characters of {len(text)} total]"
        
        return truncated
    
    @staticmethod
    def get_file_info(file_content: bytes, filename: str) -> Dict[str, Any]:
        """Get basic file information"""
        file_extension = filename.split('.')[-1].lower() if '.' in filename else ''
        
        return {
            'filename': filename,
            'file_type': file_extension,
            'file_size': len(file_content),
            'is_supported': TextExtractor.is_supported_file_type(file_extension)
        }
    
    @staticmethod
    def is_supported_file_type(file_type: str) -> bool:
        """Check if file type is supported"""
        supported_types = {
            'pdf', 'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml',
            'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'h', 'hpp',
            'go', 'rs', 'php', 'rb', 'swift', 'kt', 'scala', 'sh', 'sql',
            'css', 'html'
        }
        return file_type.lower() in supported_types
    
    @staticmethod
    def estimate_extraction_time(file_size: int, file_type: str) -> float:
        """Estimate text extraction time in seconds"""
        if file_type == 'pdf':
            # PDF extraction is slower
            return min(file_size / 100_000, 30)  # Max 30 seconds
        else:
            # Text files are fast
            return min(file_size / 1_000_000, 5)  # Max 5 seconds 