# Entscheidungen (Demo)

Neuester Eintrag oben, mit Datum und kurzer Begründung ("Warum").

## 2026-10-05 — Design-System statt Einzelstile pro Projekt
Warum: Drei Frontends ([[projekte/marketing-website]], [[projekte/mobile-app-fitness]], [[projekte/reporting-dashboard]]) hätten sonst getrennt gepflegte Buttons/Karten gehabt. #design #frontend

## 2026-09-30 — Chatbot beantwortet nur die zehn häufigsten Fragen
Warum: Höhere Trefferquote bei weniger Themen, Rest geht zuverlässig an den menschlichen Support statt falscher Antworten. #support #chatbot

## 2026-09-22 — Serverless nur für neue, unabhängige Dienste
Warum: Bestehende, stark verzahnte Dienste zuerst umzustellen wäre riskanter als mit neuen, isolierten Funktionen zu starten. #devops #backend

## 2026-09-15 — Login über bestehenden Auth-Dienst statt Neubau
Warum: Der Kunde hat schon einen Auth-Dienst für das [[projekte/webshop-relaunch]]-Projekt, ein zweiter wäre doppelte Pflege. #kundenportal #backend

## 2026-09-10 — CRM-Migration mit Schattenbetrieb statt Hartem Umstieg
Warum: Reduziert das Risiko fehlerhafter Datenübernahme — altes und neues System laufen parallel, bis die Validierung sauber ist. #crm #devops

## 2026-09-08 — Zentrales API-Gateway statt direkter Zugriffe
Warum: Kundenportal und Mobile App griffen vorher auf unterschiedliche Endpunkte zu, Rate-Limiting war pro Dienst inkonsistent. #api #security

## 2026-08-28 — Accessibility-Audit startet mit den drei größten Frontends
Warum: Begrenzte Prüfzeit zuerst dort einsetzen, wo die meisten Nutzer unterwegs sind — [[projekte/webshop-relaunch]], Marketing-Website, Kundenportal. #design #frontend
