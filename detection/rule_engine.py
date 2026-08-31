import numpy as np
import pandas as pd

class RuleBasedDetector:
    def __init__(self, threshold: float = 50.0):
        self.threshold = threshold

    def predict_score(self, X: pd.DataFrame) -> np.ndarray:
        scores = np.zeros(len(X))

        pre_release = X.get('is_pre_release_attempt', 0)
        access_count = X.get('access_count_1h', 0)
        failed_logins = X.get('failed_logins_1h', 0)
        off_hours = X.get('is_off_hours', 0)
        unique_ips = X.get('unique_ip_count', 1)
        unauth_attempts = X.get('unauthorized_attempts', 0)

        # Rule score aggregation
        scores += pre_release * 40.0
        scores += (access_count > 20).astype(float) * 25.0
        scores += (failed_logins > 3).astype(float) * 20.0
        scores += off_hours * 15.0
        scores += (unique_ips > 2).astype(float) * 15.0
        scores += (unauth_attempts > 1).astype(float) * 20.0

        return scores

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        scores = self.predict_score(X)
        return (scores >= self.threshold).astype(int)
