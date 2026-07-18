# Sprint Description: Contextual Onboarding (Tutorial Phase) & Unlockable Mission Hints Framework

## 1. Core Objective & Design Philosophy
We need a progressive onboarding system that gently introduces mechanics during the first few days of the game (the "Tutorial Phase") without permanently trivializing the puzzle loop. 
* **The Tutorial Phase (Days 1–5):** Highly simplified, automated "hand-holding" where diagnostic hints and precise countermeasures are displayed freely to prevent early-game frustration.
* **The Main Game (Day 6+):** Standard diagnostic hints are hidden by default. Players must read and interpret the sensor outputs manually.
* **The Unlockable Hint System:** In the main game, contextual mission hints (e.g., highlighting that a specific tool is highly useful) can be dynamically unlocked through strategic progression:
  1. **Hunter Competencies:** High skills (e.g., Scout with `aufklaerung >= 4`) or specific Hunter perks.
  2. **HQ Library / Upgrades:** Unlocked reference books in the Archiv or Labor (e.g., "The Salt Defense Handbook" or "Encyclopedia of Poltergeists").
  3. **Grimoire Progression:** Integration with the existing "Schwachstellenanalyse" (Knowledge Component 5).

---

## 2. Technical Requirements & Architecture

### 2.1 State Management (`engine.js`)
* Expand `S.flags` to include:
  * `S.flags.tutorialActive` (boolean, defaults to `true`, set to `false` automatically on Day 6).
  * `S.flags.library` (array of strings representing purchased/researched reference books).
* Introduce a catalog of researchable books/manuals in `DATA.LIBRARY` (e.g., `salt_defense`, `poltergeist_patterns`, `sacred_sigils_study`).

### 2.2 The Guided Tutorial Phase (Days 1 to 5)
* Throttling: During `S.flags.tutorialActive`, only allow single-entity Tier-0 contracts with standard traits.
* Full Disclosure: Automatically trigger helper alerts in the UI. For example, when inspecting a contract, immediately show which equipment counters the ghost's base traits, bypassing the need for Grimoire unlocks.

### 2.3 The "Known Unknown" Interface Rule (Permanent Feature)
* If a scan fails or is jammed (e.g., due to environmental conditions like `elektrifiziert` or because the player uses a Tier-1 tool where Tier-2 is required), the system must explicitly output *why* it failed in `M.observed` (e.g., *"Signal blocked by local electricity. Spectral Analysis [EMF T2] required to read this track."*).
* This provides economic direction ("What do I need to buy?") without spoiling the identity of the ghost.

### 2.4 Unlocking Contextual Hints in the Main Game (Day 6+)
Hints in the preparation phase (`M.phase === "vorbereitung"`) are unlocked dynamically if **at least one** of the following conditions is met:

#### A. Staff Competency
* If a deployed hunter has `aufklaerung >= 4` (or a specialized perk like "Occult Scholar"), inject a scout tip:
  * *Example UI text:* `"Scout [Hunter Name] noticed high moisture levels. Deploying Salt lines will be 10% more effective here."*
  * *Logic:* Scan the active `M.envTags` and deployed hunters' skills to generate targeted tactical advice.

#### B. HQ Library Upgrades (Wirtschafts-Sink)
* Allow players to buy specialized manuals in the Shop or unlock them via research tasks in the Archiv/Labor using ÄK and Essences.
* *Example Book:* *"Salt as a Kinetic Barrier"* (Costs: 150 ÄK, 2x Tränenessenz).
* *Logic:* If `S.flags.library.includes("salt_defense")` is true and the entity has a trait countered by salt, highlight the Saltsprühgerät in the placement phase with a glowing indicator and a short tooltip: *"Unlocking this book confirms Salt is highly effective against this entity's movement pattern."*

#### C. Grimoire Integration
* If the ghost is identified and the player has unlocked `schwachstellen` (Knowledge Level 5) in the Grimoire for this specific Ghost ID, automatically expose the required counter tags on the preparation screen.

---

## 3. UI/UX Implementation Details (`ui.js` & `style.css`)
* **Tutorial Alerts:** Render a distinct, amber-colored tutorial alert box at the top of the mission screen while `S.flags.tutorialActive` is true.
* **Hint Icons:** In the main game, when a hint is unlocked via Staff, Library, or Grimoire, display a small book icon (📖) next to the corresponding tool or trait description, showing the source of the knowledge on hover (e.g., *"Source: Library Book - Salt Defense"*).
* **Routine Grinding:** Ensure the "Routineauftrag" (routine contract) remains permanently available on the map as a low-risk, low-reward fallback for players who want to safely grind ÄK to afford the library books or better staff.

---

## 4. Acceptance Criteria
1. **Day 1–5:** Deployed missions automatically show all required countermeasures on-screen.
2. **Day 6:** The hand-holding disappears. Preparing for a mission displays no hints unless a high-level Scout is deployed, the Grimoire is advanced enough, or a matching library book has been bought.
3. **Library Purchases:** Buying a book successfully deducts ÄK/Essences and correctly unlocks targeted tool-tips in future matches.
4. **No Softlocks:** The Routine contract is always counterable with the player's current stash and equipment, even if no hints are active.