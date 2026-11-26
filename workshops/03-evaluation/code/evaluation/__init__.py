"""Evaluation for the Egyptian Civil Code RAG system (Workshop 3).

golden_set        -> what we test on
client, runner    -> ask the system every question, keep answers + contexts
retrieval_metrics -> hit@k, recall@k, precision@k, MRR, nDCG   (free)
legal_checks      -> citations, repealed articles, refusals    (free)
bilingual         -> same question in AR and EN, same articles? (free)
ragas_eval        -> faithfulness, answer relevancy, context precision/recall (LLM judge)
tracking          -> MLflow params, metrics, per-question CSV
gate              -> thresholds -> exit code for CI
"""
