import numpy as np
import pandas as pd
from typing import Dict, List, Any

# Feature columns used for training and detection scoring
FEATURE_COLUMNS = [
    'access_count_1h',
    'failed_logins_1h',
    'is_off_hours',
    'is_pre_release_attempt',
    'unique_ip_count',
    'unique_device_count',
    'download_count',
    'print_attempts',
    'unauthorized_attempts',
    'avg_request_interval_sec',
    'role_risk_factor', # 1:Setter, 2:Moderator, 3:Controller, 4:PrintingStaff
    'evasive_stealth_index'
]

def extract_features_from_logs(events: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Transforms a list of audit event records into a structured Pandas DataFrame feature matrix.
    """
    df = pd.DataFrame(events)
    if df.empty:
        return pd.DataFrame(columns=FEATURE_COLUMNS)

    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            df[col] = 0.0

    return df[FEATURE_COLUMNS]
