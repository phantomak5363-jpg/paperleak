# Detection Methodology & Anomaly Modeling

## 1. Research Question
> **"Can activity-based anomaly detection identify suspicious examination-paper access patterns while minimizing false positives?"**

---

## 2. Feature Representation Vector
Every system interaction or user audit window is transformed into a feature vector \( \mathbf{x} \in \mathbb{R}^{12} \):

\[
\mathbf{x} = \begin{bmatrix}
x_1: \text{access\_count\_1h} \\
x_2: \text{failed\_logins\_1h} \\
x_3: \text{is\_off\_hours} \in \{0, 1\} \\
x_4: \text{is\_pre\_release\_attempt} \in \{0, 1\} \\
x_5: \text{unique\_ip\_count} \\
x_6: \text{unique\_device\_count} \\
x_7: \text{download\_count} \\
x_8: \text{print\_attempts} \\
x_9: \text{unauthorized\_attempts} \\
x_{10}: \text{avg\_request\_interval\_sec} \\
x_{11}: \text{role\_risk\_factor} \\
x_{12}: \text{evasive\_stealth\_index}
\end{bmatrix}
\]

---

## 3. Modeling Approaches

### A. Rule-Based Baseline Engine
Computes a cumulative weighted score \( S(\mathbf{x}) \):

\[
S(\mathbf{x}) = 40 \cdot x_4 + 25 \cdot \mathbb{I}(x_1 > 20) + 20 \cdot \mathbb{I}(x_2 > 3) + 15 \cdot x_3 + 15 \cdot \mathbb{I}(x_5 > 2) + 20 \cdot \mathbb{I}(x_9 > 1)
\]

where \( \mathbb{I}(\cdot) \) is the indicator function.
- Decision Rule: Predict Anomaly \( \hat{y} = 1 \) if \( S(\mathbf{x}) \ge 50.0 \), else Normal \( \hat{y} = 0 \).

### B. Logistic Regression (Supervised Linear Model)
Models class probability using the sigmoid function:

\[
P(y=1|\mathbf{x}) = \sigma(\mathbf{w}^T \mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^T \mathbf{x} + b)}}
\]

### C. Random Forest Classifier (Supervised Non-Linear Ensemble)
Ensemble of decision trees trained with bootstrap aggregation (bagging) and feature sub-sampling:

\[
\hat{y}_{\text{RF}} = \text{mode}\left( \{ T_m(\mathbf{x}) \}_{m=1}^M \right)
\]

### D. Isolation Forest (Unsupervised Anomaly Model)
Isolates anomalies by randomly selecting a feature and splitting value. Path length \( h(\mathbf{x}) \) in an isolation tree measures anomaly score:

\[
s(\mathbf{x}, n) = 2^{-\frac{\mathbb{E}(h(\mathbf{x}))}{c(n)}}
\]

Anomalies yield significantly shorter path lengths \( s(\mathbf{x}, n) \to 1 \).

---

## 4. Evaluation Metrics Definitions

- **Accuracy**: \( \frac{TP + TN}{TP + TN + FP + FN} \)
- **Precision**: \( \frac{TP}{TP + FP} \)
- **Recall (Sensitivity)**: \( \frac{TP}{TP + FN} \)
- **F1-Score**: \( 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}} \)
- **False Positive Rate (FPR)**: \( \frac{FP}{FP + TN} \)
- **False Negative Rate (FNR)**: \( \frac{FN}{FN + TP} \)
