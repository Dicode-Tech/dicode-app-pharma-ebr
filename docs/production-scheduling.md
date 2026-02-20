# Production Scheduling & Cross-Contamination Safeguards

This document captures the initial scope for helping planning teams schedule batches while proactively detecting cross-contamination risks inside the Dicode EBR platform.

## 1. Problems to Solve

1. **Finite equipment and line availability** – planners need a quick way to see which vessels, rooms, and people are booked and when the next slot opens.
2. **Cleaning windows and changeover times** – scheduling must respect mandatory cleaning cycles, hold times, and QA release before the next batch starts.
3. **Cross-contamination exposure** – any overlap between incompatible products (e.g., penicillins vs. non-penicillins, cytotoxics vs. non-hazardous, allergens) has to raise a flag before work orders are released.
4. **Late changes** – adjustments to a batch (different lot, expedited order) should instantly re-run the contamination and resource checks.

## 2. Data Model Extensions

| Entity | Purpose | Key Fields |
|--------|---------|------------|
| `ProductionOrder` | Planning wrapper for a batch | orderId, recipeId, priority, targetStart, targetEnd, quantity |
| `EquipmentSlot` | Reservable unit (line, room, vessel) | equipmentId, type, cleaningProfileId, capacity |
| `CleaningProfile` | Defines cleaning steps and validation rules | profileId, minDuration, requiredTests, holdTime |
| `ProductFamily` | Categorizes recipes for incompatibility rules | familyId, name, riskTags[] (e.g., `penicillin`, `beta-lactam`, `allergenic`) |
| `IncompatibilityRule` | Matrix describing what cannot follow what | fromFamilyId, toFamilyId, constraintType ("requires-deep-clean", "forbidden"), notes |
| `ScheduleEvent` | Instances on the timeline | type (`batch`, `cleaning`, `maintenance`), equipmentId, startAt, endAt, sourceRef |

> Implementation detail: we can materialize a `production_schedule` table or view that joins `ScheduleEvent` with the latest batch status for fast queries.

## 3. Scheduling Workflow

1. **Planner selects a date range** (e.g., upcoming week).
2. Frontend loads `ScheduleEvent`s plus metadata (equipment, recipes, rules) via a new endpoint `GET /planning/schedule?from=&to=`.
3. Drag-and-drop (or inline form) to place a `ProductionOrder` onto a line automatically:
   1. Run availability check (`POST /planning/check-availability`).
   2. If the slot is free, auto-insert required cleaning blocks before/after according to `CleaningProfile`.
   3. Persist via `POST /planning/schedule` which creates `ScheduleEvent`s for batch + cleaning.
4. Any change triggers the **risk engine** (see below). Failed checks block publishing until acknowledged by QA.

## 4. Cross-Contamination Risk Engine

Algorithm outline (service `planningRiskService`):

1. **Gather context** – last scheduled product family for each equipment, upcoming batches, pending cleaning validations.
2. **Apply incompatibility matrix**:
   - If `constraintType === "forbidden"` and windows overlap ⇒ block scheduling.
   - If `constraintType === "requires-deep-clean"` ⇒ enforce additional cleaning profile before release.
3. **Residue-based scoring** – compute `riskScore = Σ(materialLoad × residueFactor / cleaningEfficiency)` using recipe BOM + cleaning profile metadata. Flag when > threshold.
4. **Personnel segregation** – verify if operators assigned to potent compounds also appear scheduled for non-potent tasks within the same shift without PPE clearance.
5. **Output** – structured object returned to frontend:

```json
{
  "status": "warning",
  "issues": [
    {
      "type": "cross-contamination",
      "severity": "high",
      "equipmentId": "GRANULATOR-02",
      "message": "Beta-lactam batch scheduled within 8h of pediatric syrup without validated full clean."
    }
  ],
  "recommendedActions": ["Insert deep-clean profile DC-03", "Hold pediatric batch until QA release"]
}
```

The backend should block the `POST /planning/schedule` request (HTTP 409) when `severity === "high"`; `medium` issues may proceed but require a QA sign-off flag stored inside the batch record.

## 5. Frontend Experience

- **Timeline board (Gantt)** per equipment line with color-coded events: production (blue), cleaning (green), maintenance (gray), blocked (red dashed).
- **Conflict sidebar** listing detected risks sorted by severity, with quick actions (“Insert cleaning”, “Request QA override”).
- **Batch detail drawer** now includes:
  - Product family + risk tags.
  - Previous product executed on same line + cleaning status.
  - Countdown timers for minimum hold times.
- **Operator view** – when a batch is assigned, show PPE checklist and highlight if they are part of another incompatible shift that day.

## 6. API Surfaces (Draft)

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/planning/schedule` | Query string: `from`, `to`, optional `equipmentId[]`. Returns aggregated events.
| `POST` | `/planning/check-availability` | Body: orderId, equipmentId, desiredStart/end. Responds with fit windows + required cleaning.
| `POST` | `/planning/schedule` | Persists the events after passing risk checks. Returns the created `ScheduleEvent`s.
| `GET` | `/planning/risk-summary` | Returns open issues + KPIs (e.g., % equipment with pending cleaning validation).

## 7. Next Steps

1. **Schema migration** for the new entities (TimescaleDB/PostgreSQL).
2. **Service layer** – new `planning` module inside `backend/src/routes` and `backend/src/services/planning`.
3. **Frontend module** – create a `PlanningBoard` view with hooks for fetching schedule + risk data.
4. **Testing** – unit tests for risk engine matrix evaluation + integration tests covering scheduling conflicts.

This branch only adds the functional spec. Implementation work will follow using this blueprint.
