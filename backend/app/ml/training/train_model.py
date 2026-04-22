import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

def train_and_save_model():
    # Sample dataset
    data = [
        ("chest pain shortness of breath palpitations", "Myocardial Infarction"),
        ("fever cough shortness of breath", "Pneumonia"),
        ("headache dizziness blurred vision", "Hypertension Crisis"),
        ("stomach ache fever nausea", "Gastroenteritis"),
        ("joint pain back pain", "Osteoarthritis"),
        ("skin rash itching", "Contact Dermatitis"),
        ("chest pain sweating nausea", "Myocardial Infarction"),
        ("chronic cough fever", "Pneumonia"),
        ("severe headache light sensitivity", "Migraine"),
        ("dizziness vertigo", "Inner Ear Issue")
    ]
    
    X, y = zip(*data)
    
    # Create pipeline with TF-IDF and Naive Bayes
    model = Pipeline([
        ('vectorizer', TfidfVectorizer()),
        ('classifier', MultinomialNB())
    ])
    
    # Train the model
    model.fit(X, y)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    
    # Save model
    model_path = os.path.join(os.path.dirname(__file__), 'disease_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_and_save_model()
