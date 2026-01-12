---
title: STAXLS
summary: Excel-driven test automation tool used in production environments.
tags: [solo, production]
featured: true
order: 1
---

## Problem

Teams needed a way to define large-scale automated tests using a familiar
interface without hand-writing Robot Framework code.

## Approach

I designed a system that converts structured Excel files into executable Robot
Framework test suites, handling validation, transformation, and execution.

## Trade-offs

- Excel offers approachability but requires strict validation
- Kept the system static-first for reliability
- Avoided over-abstraction to keep debugging simple

## Artifacts

![Architecture diagram](/images/projects/staxls-architecture.png)

## Reflection

This project taught me the value of owning systems end-to-end and making
deliberate trade-offs instead of chasing theoretical purity.
