# Requirements Document - Gestão de Contratos com Banco de Horas e Tickets

## Introduction

Este documento especifica os requisitos para o módulo de Gestão de Contratos com Banco de Horas e Tickets do sistema Books SND. O sistema gerencia contratos de clientes que podem ser baseados em horas, tickets ou ambos, com controle de baseline mensal, distribuição por alocações, repasse de saldos, cálculo de excedentes e auditoria completa de todas as operações.

O módulo é crítico para operações de cobrança e jurídico, exigindo rastreabilidade total, versionamento de alterações e interface intuitiva seguindo o design system Sonda.

## Glossary

- **Contract**: Contrato estabelecido com cliente contendo tipo (horas/tickets/ambos), período de apuração, baseline mensal e taxas
- **Baseline**: Quantidade mensal contratada de horas e/ou tickets que o