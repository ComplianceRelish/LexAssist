# test_inlegalbert.py
import os
from transformers import pipeline, AutoTokenizer, AutoModel
from huggingface_hub import login

# Set model path
model_path = "law-ai/InLegalBERT"

# Test tokenizer and model loading
print("Testing model loading...")
try:
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModel.from_pretrained(model_path)
    print("✅ Model loaded successfully")
except Exception as e:
    print(f"❌ Model loading failed: {e}")

# Test pipeline
print("\nTesting fill-mask pipeline...")
try:
    pipe = pipeline("fill-mask", model=model_path)
    result = pipe("The court [MASK] the petition filed by the appellant.")
    print("✅ Pipeline works correctly")
    print("Sample output:")
    for pred in result[:2]:
        print(f"  - {pred['token_str']} (score: {pred['score']:.4f})")
except Exception as e:
    print(f"❌ Pipeline failed: {e}")

print("\nAll tests completed")
