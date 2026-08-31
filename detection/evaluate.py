import os
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

from dataset_generator import generate_synthetic_dataset
from rule_engine import RuleBasedDetector
from ml_models import ModelSuite

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "fpr": round(fpr, 4),
        "fnr": round(fnr, 4),
        "confusion_matrix": {
            "TN": int(tn),
            "FP": int(fp),
            "FN": int(fn),
            "TP": int(tp)
        }
    }

def run_experiments():
    results_dir = os.path.join(os.path.dirname(__file__), 'results')
    os.makedirs(results_dir, exist_ok=True)

    print("Generating Synthetic Dataset (5,000 samples)...")
    X, y = generate_synthetic_dataset(num_samples=5000, random_seed=42)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42, stratify=y
    )

    print(f"Dataset Split: Train={len(X_train)} samples, Test={len(X_test)} samples")

    # 1. Rule-Based Baseline Engine
    print("Evaluating Rule-Based Baseline Engine...")
    rule_engine = RuleBasedDetector(threshold=50.0)
    y_pred_rule = rule_engine.predict(X_test)

    # 2. Machine Learning Suite
    print("Training Supervised & Unsupervised Machine Learning Models...")
    suite = ModelSuite(random_state=42)
    suite.train(X_train, y_train)
    ml_preds = suite.predict_all(X_test)

    all_predictions = {
        "Rule-Based Baseline": y_pred_rule,
        "Logistic Regression": ml_preds["Logistic Regression"],
        "Random Forest": ml_preds["Random Forest"],
        "Isolation Forest": ml_preds["Isolation Forest"]
    }

    # Overall Evaluation
    results_summary = {}
    print("\n--- EXPERIMENTAL RESULTS OVERALL ---")
    for model_name, preds in all_predictions.items():
        metrics = compute_metrics(y_test.values, preds)
        results_summary[model_name] = metrics
        print(f"Model: {model_name:22s} | Acc: {metrics['accuracy']:.4f} | Prec: {metrics['precision']:.4f} | Rec: {metrics['recall']:.4f} | F1: {metrics['f1_score']:.4f} | FPR: {metrics['fpr']:.4f}")

    # Evasive Scenario Evaluation
    evasive_mask = X_test['evasive_stealth_index'] > 0.5
    X_test_evasive = X_test[evasive_mask]
    y_test_evasive = y_test[evasive_mask]

    evasive_results = {}
    print("\n--- EVASIVE / ADVERSARIAL SCENARIO EVALUATION ---")
    for model_name, preds in all_predictions.items():
        preds_evasive = preds[evasive_mask]
        metrics_evasive = compute_metrics(y_test_evasive.values, preds_evasive)
        evasive_results[model_name] = metrics_evasive
        print(f"Model: {model_name:22s} | Stealth Detection Recall: {metrics_evasive['recall']:.4f} | F1: {metrics_evasive['f1_score']:.4f}")

    combined_output = {
        "overall_experiments": results_summary,
        "evasive_experiments": evasive_results,
        "dataset_info": {
            "total_samples": len(X),
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "evasive_test_samples": int(evasive_mask.sum())
        }
    }

    # Save to JSON
    json_path = os.path.join(results_dir, 'experiment_results.json')
    with open(json_path, 'w') as f:
        json.dump(combined_output, f, indent=2)
    print(f"\nSaved experiment metrics to: {json_path}")

    # Plot Comparison Charts
    plot_results(results_summary, evasive_results, results_dir)
    print("Generated evaluation plots in results directory.")

def plot_results(overall: dict, evasive: dict, output_dir: str):
    models = list(overall.keys())
    metrics = ['accuracy', 'precision', 'recall', 'f1_score']

    # 1. Overall Performance Comparison
    fig, ax = plt.subplots(figsize=(10, 6))
    x = np.arange(len(models))
    width = 0.2

    for i, metric in enumerate(metrics):
        values = [overall[m][metric] for m in models]
        ax.bar(x + (i - 1.5) * width, values, width, label=metric.capitalize())

    ax.set_ylabel('Score (0.0 - 1.0)')
    ax.set_title('Detection Model Performance Comparison (Overall Synthetic Benchmark)')
    ax.set_xticks(x)
    ax.set_xticklabels(models, rotation=15)
    ax.set_ylim(0, 1.05)
    ax.legend(loc='lower right')
    ax.grid(axis='y', linestyle='--', alpha=0.7)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'model_performance_comparison.png'), dpi=300)
    plt.close()

    # 2. Evasive Stealth Detection Recall
    fig, ax = plt.subplots(figsize=(8, 5))
    recalls = [evasive[m]['recall'] for m in models]
    colors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6']

    bars = ax.bar(models, recalls, color=colors, width=0.5)
    ax.set_ylabel('Detection Recall (Evasive Adversaries)')
    ax.set_title('Evasive / Adversarial Paper Access Detection Rate')
    ax.set_ylim(0, 1.05)
    ax.grid(axis='y', linestyle='--', alpha=0.7)

    for bar in bars:
        height = bar.get_height()
        ax.annotate(f'{height:.2f}',
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3),  # 3 points vertical offset
                    textcoords="offset points",
                    ha='center', va='bottom', fontweight='bold')

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'evasive_detection_recall.png'), dpi=300)
    plt.close()

if __name__ == "__main__":
    run_experiments()
