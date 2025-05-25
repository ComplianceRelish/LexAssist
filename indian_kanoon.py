import os
import json
import requests
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('indian_kanoon_api')

class IndianKanoonAPI:
    """
    Client for the Indian Kanoon API to search and retrieve legal documents.
    """
    
    def __init__(self, api_key: str):
        """
        Initialize the Indian Kanoon API client.
        
        Args:
            api_key: The API key for authentication
        """
        self.api_key = api_key
        self.base_url = "https://api.indiankanoon.org"
        self.headers = {
            "Authorization": f"Token {self.api_key}",
            "Accept": "application/json"
        }
        logger.info("Indian Kanoon API client initialized")
    
    def search(self, query: str, page_num: int = 0, doc_types: Optional[str] = None, 
               from_date: Optional[str] = None, to_date: Optional[str] = None,
               title: Optional[str] = None, cite: Optional[str] = None,
               author: Optional[str] = None, bench: Optional[str] = None,
               max_cites: Optional[int] = None, max_pages: Optional[int] = None) -> Dict[str, Any]:
        """
        Search for legal documents based on the provided query and filters.
        
        Args:
            query: The search query
            page_num: Page number (starting from 0)
            doc_types: Filter by document types (e.g., "supremecourt,highcourts")
            from_date: Filter by minimum date (format: DD-MM-YYYY)
            to_date: Filter by maximum date (format: DD-MM-YYYY)
            title: Filter by words in document title
            cite: Filter by citation
            author: Filter by judgment author
            bench: Filter by judge on the bench
            max_cites: Maximum number of citations to include per document
            max_pages: Maximum number of pages to retrieve in a single call
            
        Returns:
            Dict containing search results
        """
        endpoint = f"{self.base_url}/search/"
        params = {"formInput": query, "pagenum": page_num}
        
        # Add optional parameters if provided
        if doc_types:
            params["doctypes"] = doc_types
        if from_date:
            params["fromdate"] = from_date
        if to_date:
            params["todate"] = to_date
        if title:
            params["title"] = title
        if cite:
            params["cite"] = cite
        if author:
            params["author"] = author
        if bench:
            params["bench"] = bench
        if max_cites:
            params["maxcites"] = max_cites
        if max_pages:
            params["maxpages"] = max_pages
        
        logger.info(f"Searching Indian Kanoon with query: {query}")
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error searching Indian Kanoon: {str(e)}")
            return {"error": str(e)}
    
    def get_document(self, doc_id: str, max_cites: Optional[int] = None, 
                    max_cited_by: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieve a specific document by its ID.
        
        Args:
            doc_id: The document ID
            max_cites: Maximum number of citations to include
            max_cited_by: Maximum number of cited-by documents to include
            
        Returns:
            Dict containing the document data
        """
        endpoint = f"{self.base_url}/doc/{doc_id}/"
        params = {}
        
        if max_cites:
            params["maxcites"] = max_cites
        if max_cited_by:
            params["maxcitedby"] = max_cited_by
        
        logger.info(f"Retrieving document with ID: {doc_id}")
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error retrieving document: {str(e)}")
            return {"error": str(e)}
    
    def get_document_fragments(self, doc_id: str, query: str) -> Dict[str, Any]:
        """
        Retrieve fragments of a document that match a specific query.
        
        Args:
            doc_id: The document ID
            query: The search query to highlight in the document
            
        Returns:
            Dict containing the document fragments
        """
        endpoint = f"{self.base_url}/docfragment/{doc_id}/"
        params = {"formInput": query}
        
        logger.info(f"Retrieving document fragments for ID: {doc_id} with query: {query}")
        try:
            response = requests.get(endpoint, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error retrieving document fragments: {str(e)}")
            return {"error": str(e)}
    
    def get_document_metadata(self, doc_id: str) -> Dict[str, Any]:
        """
        Retrieve metadata for a specific document.
        
        Args:
            doc_id: The document ID
            
        Returns:
            Dict containing the document metadata
        """
        endpoint = f"{self.base_url}/docmeta/{doc_id}/"
        
        logger.info(f"Retrieving metadata for document ID: {doc_id}")
        try:
            response = requests.get(endpoint, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error retrieving document metadata: {str(e)}")
            return {"error": str(e)}


# Example usage
if __name__ == "__main__":
    # This is just for testing - in production, the API key should be stored securely
    api_key = "d053cb3e0082a68b58def9f16e1b43c7a497faf4"
    client = IndianKanoonAPI(api_key)
    
    # Example search
    results = client.search("right to privacy", doc_types="supremecourt", max_cites=5)
    print(json.dumps(results, indent=2))
