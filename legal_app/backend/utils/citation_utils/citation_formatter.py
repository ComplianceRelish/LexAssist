import re
from datetime import datetime

class CitationFormatter:
    """
    Citation Formatter for standardizing legal citations
    Implements Bluebook and AGLC (Australian) citation formats
    """
    def __init__(self):
        # Citation format specifications
        self.formats = {
            'bluebook': {
                'case_law': {
                    'pattern': '{parties}, {volume} {reporter} {page} ({court} {year})',
                    'short_pattern': '{parties_short}, {volume} {reporter} at {pincite}'
                },
                'statute': {
                    'pattern': '{title}, {volume} {code} § {section} ({year})',
                    'short_pattern': '{title} § {section}'
                },
                'regulation': {
                    'pattern': '{title}, {volume} {code} § {section} ({year})',
                    'short_pattern': '{title} § {section}'
                },
                'constitution': {
                    'pattern': '{constitution} {article}, § {section}',
                    'short_pattern': '{constitution} {article}, § {section}'
                },
                'journal': {
                    'pattern': '{author}, {title}, {volume} {journal} {page} ({year})',
                    'short_pattern': '{author_short}, supra note {note}, at {pincite}'
                }
            },
            'aglc': {
                'case_law': {
                    'pattern': '{parties} ({year}) {volume} {reporter} {page}',
                    'short_pattern': '{parties_short} ({note})'
                },
                'statute': {
                    'pattern': '{title} {year} ({jurisdiction}) s {section}',
                    'short_pattern': '{title} ({note}) s {section}'
                },
                'regulation': {
                    'pattern': '{title} {year} ({jurisdiction}) reg {regulation}',
                    'short_pattern': '{title} ({note}) reg {regulation}'
                },
                'constitution': {
                    'pattern': '{constitution} s {section}',
                    'short_pattern': '{constitution} s {section}'
                },
                'journal': {
                    'pattern': '{author}, \'{title}\' ({year}) {volume}({issue}) {journal} {page}',
                    'short_pattern': '{author_short} (n {note}) {pincite}'
                }
            },
            'indian': {
                'case_law': {
                    'pattern': '{parties}, ({year}) {volume} {reporter} {page}',
                    'short_pattern': '{parties_short} (supra)'
                },
                'statute': {
                    'pattern': '{title}, {year} ({act_number} of {year})',
                    'short_pattern': '{title}'
                },
                'regulation': {
                    'pattern': '{title}, {year}',
                    'short_pattern': '{title}'
                },
                'constitution': {
                    'pattern': '{constitution} {article}, {part}',
                    'short_pattern': '{constitution} {article}, {part}'
                }
            }
        }
        
        # Reporter abbreviations
        self.reporters = {
            'U.S.': 'United States Reports',
            'S. Ct.': 'Supreme Court Reporter',
            'L. Ed.': 'Lawyers\' Edition',
            'F.': 'Federal Reporter',
            'F.2d': 'Federal Reporter, Second Series',
            'F.3d': 'Federal Reporter, Third Series',
            'F. Supp.': 'Federal Supplement',
            'F. Supp. 2d': 'Federal Supplement, Second Series',
            'F. Supp. 3d': 'Federal Supplement, Third Series',
            'SCC': 'Supreme Court Cases',
            'SCR': 'Supreme Court Reports',
            'AIR SC': 'All India Reporter (Supreme Court)',
            'AIR': 'All India Reporter'
        }
    
    def format_citation(self, citation_data, style='bluebook', citation_type=None, short_form=False):
        """
        Format citation according to specified style
        
        Args:
            citation_data: Citation data dictionary
            style: Citation style ('bluebook', 'aglc', or 'indian')
            citation_type: Type of citation ('case_law', 'statute', etc.)
            short_form: Whether to use short form citation
            
        Returns:
            Formatted citation string
        """
        # Validate inputs
        if style not in self.formats:
            raise ValueError(f"Unsupported citation style: {style}")
        
        # Determine citation type if not provided
        if not citation_type:
            citation_type = self._infer_citation_type(citation_data)
            
        if citation_type not in self.formats[style]:
            raise ValueError(f"Unsupported citation type '{citation_type}' for style '{style}'")
        
        # Get appropriate pattern
        pattern = self.formats[style][citation_type]['short_pattern'] if short_form else self.formats[style][citation_type]['pattern']
        
        # Format citation
        try:
            formatted_citation = pattern.format(**citation_data)
            return formatted_citation
        except KeyError as e:
            missing_key = str(e).strip("'")
            return f"Missing data for {missing_key} in citation"
    
    def _infer_citation_type(self, citation_data):
        """
        Infer the type of citation from available data
        
        Args:
            citation_data: Citation data dictionary
            
        Returns:
            Inferred citation type
        """
        if 'parties' in citation_data:
            return 'case_law'
        elif 'constitution' in citation_data:
            return 'constitution'
        elif 'section' in citation_data and ('title' in citation_data or 'code' in citation_data):
            return 'statute'
        elif 'regulation' in citation_data or 'reg' in citation_data:
            return 'regulation'
        elif 'author' in citation_data or 'journal' in citation_data:
            return 'journal'
        else:
            return 'other'
    
    def parse_citation(self, citation_text):
        """
        Parse a citation string to extract structured data
        
        Args:
            citation_text: Citation text to parse
            
        Returns:
            Dictionary of parsed citation data
        """
        # Case law patterns
        case_patterns = [
            # Bluebook: Marbury v. Madison, 5 U.S. 137 (1803)
            r'(?P<parties>[\w\s]+ v\.? [\w\s]+),\s+(?P<volume>\d+)\s+(?P<reporter>[\w\.\s]+)\s+(?P<page>\d+)\s+\((?:(?P<court>[\w\s]+)\s+)?(?P<year>\d{4})\)',
            # AGLC: Mabo v Queensland (No 2) (1992) 175 CLR 1
            r'(?P<parties>[\w\s]+ v [\w\s]+( \([\w\s]+\))?)\s+\((?P<year>\d{4})\)\s+(?P<volume>\d+)\s+(?P<reporter>[\w\s]+)\s+(?P<page>\d+)',
            # Indian: State of Punjab v. Baldev Singh, (1999) 6 SCC 172
            r'(?P<parties>[\w\s]+ v\.? [\w\s]+),\s+\((?P<year>\d{4})\)\s+(?P<volume>\d+)\s+(?P<reporter>[\w\s]+)\s+(?P<page>\d+)'
        ]
        
        # Statute patterns
        statute_patterns = [
            # Bluebook: Civil Rights Act of 1964, 42 U.S.C. § 2000e (2012)
            r'(?P<title>[\w\s]+(?:\sof\s\d{4})?),\s+(?P<volume>\d+)\s+(?P<code>[\w\.\s]+)\s+§\s+(?P<section>[\w\-\.]+)\s+\((?P<year>\d{4})\)',
            # AGLC: Criminal Code 1995 (Cth) s 80.2C
            r'(?P<title>[\w\s]+)\s+(?P<year>\d{4})\s+\((?P<jurisdiction>[\w]+)\)\s+s\s+(?P<section>[\w\-\.]+)',
            # Indian: Income Tax Act, 1961 (43 of 1961)
            r'(?P<title>[\w\s]+),\s+(?P<year>\d{4})\s+\((?P<act_number>\d+)\s+of\s+(?P<act_year>\d{4})\)'
        ]
        
        # Constitution patterns
        constitution_patterns = [
            # Bluebook: U.S. Const. art. I, § 8
            r'(?P<constitution>[\w\.\s]+)\s+(?P<article>art\.?\s+[IVX]+),\s+§\s+(?P<section>\d+)',
            # Indian: Constitution of India, Article 21
            r'(?P<constitution>Constitution\s+of\s+India),\s+(?P<article>Article\s+\d+)'
        ]
        
        # Journal patterns
        journal_patterns = [
            # Bluebook: John Smith, Legal Citation Standards, 15 J. Legal Info. 1 (2005)
            r'(?P<author>[\w\s\.]+),\s+(?P<title>[\w\s\:]+),\s+(?P<volume>\d+)\s+(?P<journal>[\w\.\s]+)\s+(?P<page>\d+)\s+\((?P<year>\d{4})\)',
            # AGLC: John Smith, 'Legal Citation Standards' (2005) 15(2) J Legal Info 1
            r'(?P<author>[\w\s\.]+),\s+\'(?P<title>[\w\s\:]+)\'\s+\((?P<year>\d{4})\)\s+(?P<volume>\d+)(?:\((?P<issue>\d+)\))?\s+(?P<journal>[\w\s]+)\s+(?P<page>\d+)'
        ]
        
        # Try all patterns
        all_patterns = case_patterns + statute_patterns + constitution_patterns + journal_patterns
        
        for pattern in all_patterns:
            match = re.match(pattern, citation_text)
            if match:
                return match.groupdict()
        
        # If no pattern matches, return minimal data
        return {
            'raw_citation': citation_text,
            'parsed': False
        }
    
    def standardize_reporter(self, reporter):
        """
        Standardize reporter abbreviations
        
        Args:
            reporter: Reporter name or abbreviation
            
        Returns:
            Standardized reporter abbreviation
        """
        # Check if it's already a standard abbreviation
        if reporter in self.reporters:
            return reporter
        
        # Check if it's a full name that needs abbreviation
        for abbr, full_name in self.reporters.items():
            if reporter.lower() == full_name.lower():
                return abbr
        
        # Otherwise, return as is
        return reporter
    
    def format_parties(self, parties, short_form=False):
        """
        Format party names according to citation rules
        
        Args:
            parties: Party names string
            short_form: Whether to use short form
            
        Returns:
            Formatted party names
        """
        if not parties:
            return ''
            
        # Extract the first plaintiff and first defendant
        if ' v. ' in parties:
            parts = parties.split(' v. ')
        elif ' v ' in parties:
            parts = parties.split(' v ')
        else:
            return parties
            
        if len(parts) != 2:
            return parties
            
        plaintiff = parts[0].strip()
        defendant = parts[1].strip()
        
        # For short form, use just last names
        if short_form:
            # Extract last name for plaintiff
            plaintiff_parts = plaintiff.split()
            if len(plaintiff_parts) > 1:
                plaintiff = plaintiff_parts[-1]
                
            # Extract last name for defendant
            defendant_parts = defendant.split()
            if len(defendant_parts) > 1:
                defendant = defendant_parts[-1]
                
            return f"{plaintiff} v. {defendant}"
        
        return parties
    
    def extract_citation_components(self, text):
        """
        Extract citation components from text
        
        Args:
            text: Text containing citations
            
        Returns:
            List of extracted citations with components
        """
        # Common citation patterns to look for
        citation_patterns = [
            # Case citations
            r'(\w+\s+v\.?\s+\w+,\s+\d+\s+[\w\.\s]+\s+\d+\s+\(\d{4}\))',
            r'(\w+\s+v\.?\s+\w+\s+\(\d{4}\)\s+\d+\s+[\w\s]+\s+\d+)',
            # Statute citations
            r'([\w\s]+,\s+\d+\s+[\w\.\s]+\s+§\s+[\w\-\.]+\s+\(\d{4}\))',
            r'([\w\s]+\s+\d{4}\s+\([\w]+\)\s+s\s+[\w\-\.]+)',
            # Constitution citations
            r'([\w\.\s]+\s+art\.?\s+[IVX]+,\s+§\s+\d+)',
            # Journal citations
            r'([\w\s\.]+,\s+[\w\s\:]+,\s+\d+\s+[\w\.\s]+\s+\d+\s+\(\d{4}\))'
        ]
        
        extracted_citations = []
        
        for pattern in citation_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                citation_text = match.group(1)
                components = self.parse_citation(citation_text)
                components['raw_citation'] = citation_text
                components['start_pos'] = match.start()
                components['end_pos'] = match.end()
                
                extracted_citations.append(components)
        
        # Sort by position in text
        extracted_citations.sort(key=lambda x: x.get('start_pos', 0))
        
        return extracted_citations
