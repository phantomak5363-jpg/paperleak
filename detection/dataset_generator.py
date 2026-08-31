import numpy as np
import pandas as pd
from typing import Tuple

def generate_synthetic_dataset(num_samples: int = 5000, random_seed: int = 42) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Generates a realistic synthetic dataset of user activity features and ground-truth anomaly labels.
    Labels: 0 = Normal, 1 = Suspicious / Anomalous (Obvious or Evasive).
    """
    np.random.seed(random_seed)

    num_normal = int(num_samples * 0.70)
    num_obvious_anomalous = int(num_samples * 0.15)
    num_evasive_anomalous = num_samples - num_normal - num_obvious_anomalous

    # 1. Normal Activity Scenarios (Label 0)
    normal_data = {
        'access_count_1h': np.random.poisson(lam=2, size=num_normal),
        'failed_logins_1h': np.random.binomial(n=2, p=0.05, size=num_normal),
        'is_off_hours': np.random.binomial(n=1, p=0.08, size=num_normal),
        'is_pre_release_attempt': np.zeros(num_normal, dtype=int),
        'unique_ip_count': np.random.choice([1, 2], size=num_normal, p=[0.92, 0.08]),
        'unique_device_count': np.ones(num_normal, dtype=int),
        'download_count': np.random.binomial(n=3, p=0.2, size=num_normal),
        'print_attempts': np.random.binomial(n=2, p=0.15, size=num_normal),
        'unauthorized_attempts': np.zeros(num_normal, dtype=int),
        'avg_request_interval_sec': np.random.normal(loc=120, scale=30, size=num_normal).clip(10, 600),
        'role_risk_factor': np.random.choice([1, 2, 3, 4], size=num_normal),
        'evasive_stealth_index': np.zeros(num_normal, dtype=float),
        'label': np.zeros(num_normal, dtype=int)
    }

    # 2. Obvious Anomalous Scenarios (Label 1)
    obvious_data = {
        'access_count_1h': np.random.randint(25, 100, size=num_obvious_anomalous),
        'failed_logins_1h': np.random.randint(5, 20, size=num_obvious_anomalous),
        'is_off_hours': np.random.binomial(n=1, p=0.75, size=num_obvious_anomalous),
        'is_pre_release_attempt': np.random.binomial(n=1, p=0.85, size=num_obvious_anomalous),
        'unique_ip_count': np.random.randint(3, 8, size=num_obvious_anomalous),
        'unique_device_count': np.random.randint(2, 5, size=num_obvious_anomalous),
        'download_count': np.random.randint(5, 15, size=num_obvious_anomalous),
        'print_attempts': np.random.randint(4, 12, size=num_obvious_anomalous),
        'unauthorized_attempts': np.random.randint(3, 10, size=num_obvious_anomalous),
        'avg_request_interval_sec': np.random.uniform(1.0, 5.0, size=num_obvious_anomalous), # Burst requests
        'role_risk_factor': np.random.choice([4, 1], size=num_obvious_anomalous),
        'evasive_stealth_index': np.zeros(num_obvious_anomalous, dtype=float),
        'label': np.ones(num_obvious_anomalous, dtype=int)
    }

    # 3. Evasive / Adversarial Anomalous Scenarios (Label 1)
    # Designed to bypass naive rule thresholds (low frequency, spread out intervals, subtle pre-release checks)
    evasive_data = {
        'access_count_1h': np.random.randint(3, 8, size=num_evasive_anomalous), # Looks almost normal
        'failed_logins_1h': np.random.binomial(n=1, p=0.2, size=num_evasive_anomalous), # Minimal failed logins
        'is_off_hours': np.random.binomial(n=1, p=0.40, size=num_evasive_anomalous),
        'is_pre_release_attempt': np.random.binomial(n=1, p=0.90, size=num_evasive_anomalous), # Core subtle intent
        'unique_ip_count': np.random.choice([1, 2], size=num_evasive_anomalous, p=[0.7, 0.3]),
        'unique_device_count': np.ones(num_evasive_anomalous, dtype=int),
        'download_count': np.random.binomial(n=2, p=0.5, size=num_evasive_anomalous),
        'print_attempts': np.ones(num_evasive_anomalous, dtype=int),
        'unauthorized_attempts': np.ones(num_evasive_anomalous, dtype=int), # Single stealth attempt
        'avg_request_interval_sec': np.random.uniform(180, 450, size=num_evasive_anomalous), # Slow rate delay
        'role_risk_factor': np.random.choice([4, 1], size=num_evasive_anomalous),
        'evasive_stealth_index': np.random.uniform(0.7, 1.0, size=num_evasive_anomalous),
        'label': np.ones(num_evasive_anomalous, dtype=int)
    }

    df_normal = pd.DataFrame(normal_data)
    df_obvious = pd.DataFrame(obvious_data)
    df_evasive = pd.DataFrame(evasive_data)

    df_combined = pd.concat([df_normal, df_obvious, df_evasive], ignore_index=True)
    df_combined = df_combined.sample(frac=1.0, random_state=random_seed).reset_index(drop=True)

    X = df_combined.drop(columns=['label'])
    y = df_combined['label']

    return X, y
