import os
import json
import shutil
from datetime import datetime
import logging
from typing import Dict, List, Optional, Union, Any

logger = logging.getLogger(__name__)

class ModelRegistry:
    """
    Model Registry for managing and versioning transformer models
    """
    def __init__(self, registry_path: str):
        """
        Initialize Model Registry
        
        Args:
            registry_path: Path to registry directory
        """
        self.registry_path = registry_path
        self.models_dir = os.path.join(registry_path, "models")
        self.registry_file = os.path.join(registry_path, "registry.json")
        self.registry = self._load_registry()
        
        # Ensure registry directories exist
        os.makedirs(self.registry_path, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)
    
    def _load_registry(self) -> Dict:
        """
        Load registry data from file
        
        Returns:
            Registry data
        """
        if os.path.exists(self.registry_file):
            try:
                with open(self.registry_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading model registry: {e}")
                return {"models": {}}
        return {"models": {}}
    
    def _save_registry(self):
        """
        Save registry data to file
        """
        try:
            with open(self.registry_file, 'w') as f:
                json.dump(self.registry, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving model registry: {e}")
    
    def register_model(self, model_id: str, model_path: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register a model in the registry
        
        Args:
            model_id: Unique model identifier
            model_path: Path to model files
            metadata: Model metadata
            
        Returns:
            Model registration information
        """
        if not os.path.exists(model_path):
            raise ValueError(f"Model path does not exist: {model_path}")
        
        # Create model version
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        version = f"v_{timestamp}"
        
        # Add model to registry if not exists
        if model_id not in self.registry["models"]:
            self.registry["models"][model_id] = {
                "versions": {},
                "latest_version": None,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
        
        # Create model version directory
        model_version_dir = os.path.join(self.models_dir, model_id, version)
        os.makedirs(model_version_dir, exist_ok=True)
        
        # Copy model files
        try:
            if os.path.isdir(model_path):
                # Copy directory contents
                for item in os.listdir(model_path):
                    s = os.path.join(model_path, item)
                    d = os.path.join(model_version_dir, item)
                    if os.path.isdir(s):
                        shutil.copytree(s, d)
                    else:
                        shutil.copy2(s, d)
            else:
                # Copy file
                shutil.copy2(model_path, model_version_dir)
        except Exception as e:
            logger.error(f"Error copying model files: {e}")
            raise
        
        # Update registry
        version_info = {
            "version": version,
            "path": model_version_dir,
            "created_at": datetime.now().isoformat(),
            "metadata": metadata
        }
        
        self.registry["models"][model_id]["versions"][version] = version_info
        self.registry["models"][model_id]["latest_version"] = version
        self.registry["models"][model_id]["updated_at"] = datetime.now().isoformat()
        
        self._save_registry()
        
        logger.info(f"Registered model {model_id} version {version}")
        
        return version_info
    
    def get_model(self, model_id: str, version: Optional[str] = None) -> Dict[str, Any]:
        """
        Get model information from registry
        
        Args:
            model_id: Model identifier
            version: Optional version (default: latest)
            
        Returns:
            Model information
        """
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model not found in registry: {model_id}")
        
        model_info = self.registry["models"][model_id]
        
        # Get specific version or latest
        if version is None:
            version = model_info["latest_version"]
            
        if version not in model_info["versions"]:
            raise ValueError(f"Version {version} not found for model {model_id}")
            
        return model_info["versions"][version]
    
    def get_model_path(self, model_id: str, version: Optional[str] = None) -> str:
        """
        Get path to model files
        
        Args:
            model_id: Model identifier
            version: Optional version (default: latest)
            
        Returns:
            Path to model files
        """
        model_info = self.get_model(model_id, version)
        return model_info["path"]
    
    def list_models(self) -> List[Dict[str, Any]]:
        """
        List all models in registry
        
        Returns:
            List of model information
        """
        models = []
        for model_id, model_info in self.registry["models"].items():
            latest_version = model_info["latest_version"]
            if latest_version:
                version_info = model_info["versions"][latest_version]
                models.append({
                    "model_id": model_id,
                    "latest_version": latest_version,
                    "created_at": model_info["created_at"],
                    "updated_at": model_info["updated_at"],
                    "metadata": version_info["metadata"]
                })
        return models
    
    def list_versions(self, model_id: str) -> List[Dict[str, Any]]:
        """
        List all versions of a model
        
        Args:
            model_id: Model identifier
            
        Returns:
            List of version information
        """
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model not found in registry: {model_id}")
            
        model_info = self.registry["models"][model_id]
        versions = []
        
        for version_id, version_info in model_info["versions"].items():
            versions.append({
                "version": version_id,
                "created_at": version_info["created_at"],
                "metadata": version_info["metadata"],
                "is_latest": version_id == model_info["latest_version"]
            })
            
        # Sort by creation date (newest first)
        versions.sort(key=lambda x: x["created_at"], reverse=True)
        
        return versions
    
    def set_default_version(self, model_id: str, version: str) -> Dict[str, Any]:
        """
        Set default version for a model
        
        Args:
            model_id: Model identifier
            version: Version to set as default
            
        Returns:
            Updated model information
        """
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model not found in registry: {model_id}")
            
        model_info = self.registry["models"][model_id]
        
        if version not in model_info["versions"]:
            raise ValueError(f"Version {version} not found for model {model_id}")
            
        model_info["latest_version"] = version
        model_info["updated_at"] = datetime.now().isoformat()
        
        self._save_registry()
        
        logger.info(f"Set default version of {model_id} to {version}")
        
        return self.get_model(model_id, version)
    
    def delete_model(self, model_id: str) -> bool:
        """
        Delete a model and all its versions
        
        Args:
            model_id: Model identifier
            
        Returns:
            True if successful
        """
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model not found in registry: {model_id}")
            
        # Delete model directory
        model_dir = os.path.join(self.models_dir, model_id)
        if os.path.exists(model_dir):
            try:
                shutil.rmtree(model_dir)
            except Exception as e:
                logger.error(f"Error deleting model directory: {e}")
                raise
        
        # Remove from registry
        del self.registry["models"][model_id]
        self._save_registry()
        
        logger.info(f"Deleted model {model_id}")
        
        return True
    
    def delete_version(self, model_id: str, version: str) -> bool:
        """
        Delete a specific model version
        
        Args:
            model_id: Model identifier
            version: Version to delete
            
        Returns:
            True if successful
        """
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model not found in registry: {model_id}")
            
        model_info = self.registry["models"][model_id]
        
        if version not in model_info["versions"]:
            raise ValueError(f"Version {version} not found for model {model_id}")
            
        # Cannot delete latest version
        if version == model_info["latest_version"]:
            raise ValueError(f"Cannot delete latest version. Set a new default version first.")
            
        # Delete version directory
        version_dir = os.path.join(self.models_dir, model_id, version)
        if os.path.exists(version_dir):
            try:
                shutil.rmtree(version_dir)
            except Exception as e:
                logger.error(f"Error deleting version directory: {e}")
                raise
        
        # Remove from registry
        del model_info["versions"][version]
        self._save_registry()
        
        logger.info(f"Deleted version {version} of model {model_id}")
        
        return True
    
    def update_metadata(self, model_id: str, version: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update metadata for a model version
        
        Args:
            model_id: Model identifier
            version: Model version
            metadata: New metadata
            
        Returns:
            Updated model information
        """
        if model_id not in self.registry["models"]:
            raise ValueError(f"Model not found in registry: {model_id}")
            
        model_info = self.registry["models"][model_id]
        
        if version not in model_info["versions"]:
            raise ValueError(f"Version {version} not found for model {model_id}")
            
        # Update metadata
        model_info["versions"][version]["metadata"].update(metadata)
        model_info["updated_at"] = datetime.now().isoformat()
        
        self._save_registry()
        
        logger.info(f"Updated metadata for {model_id} version {version}")
        
        return self.get_model(model_id, version)