import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

class ModelSuite:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        
        # 1. Logistic Regression Pipeline with Feature Scaling
        self.log_reg = make_pipeline(
            StandardScaler(),
            LogisticRegression(max_iter=1000, random_state=self.random_state)
        )
        
        # 2. Random Forest Classifier
        self.random_forest = RandomForestClassifier(
            n_estimators=100, max_depth=10, random_state=self.random_state
        )

        # 3. Isolation Forest (Unsupervised - contamination ~ 30%)
        self.isolation_forest = IsolationForest(
            contamination=0.30, random_state=self.random_state
        )

    def train(self, X_train: pd.DataFrame, y_train: pd.Series):
        # Train Supervised Models
        self.log_reg.fit(X_train, y_train)
        self.random_forest.fit(X_train, y_train)
        
        # Train Unsupervised Model on features
        self.isolation_forest.fit(X_train)

    def predict_all(self, X_test: pd.DataFrame) -> dict:
        # Predictions for Supervised Models
        y_pred_logreg = self.log_reg.predict(X_test)
        y_pred_rf = self.random_forest.predict(X_test)

        # Isolation Forest outputs 1 for inliers (normal) and -1 for outliers (anomalous)
        iso_preds = self.isolation_forest.predict(X_test)
        y_pred_iso = np.where(iso_preds == -1, 1, 0)

        return {
            "Logistic Regression": y_pred_logreg,
            "Random Forest": y_pred_rf,
            "Isolation Forest": y_pred_iso
        }
