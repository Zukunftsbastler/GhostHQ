Act as a QA and Balancing Engineer for the GhostHQ simulation game. Currently, the game's economy and encounter loops are overly punishing, leading to cascading failures, early bankruptcy, and player frustration.

Your task is to build a headless simulation environment to test the game, analyze the mathematical bottlenecks, and implement concrete balancing fixes.

**Hardware Constraint:** This simulation will run locally on an Apple M3 Pro with 32GB of RAM. Ensure that if you utilize parallel processing (e.g., Node.js worker_threads) to speed up the batch runs, you deliberately limit the concurrency (e.g., maximum 6-8 workers) and handle memory efficiently to prevent out-of-memory crashes or system unresponsiveness.

Please execute the following steps:

1. **Setup Dedicated Workspace:** Create a new subfolder named `simulations/`. All runner scripts, agent logic, and output logs must be isolated here.
2. **Build the Headless Runner:** Write a Node.js script that imports `engine.js`, `data.js`, and `rng.js`. The runner must be able to instantiate a game state and progress through days continuously without any DOM APIs.
3. **Implement a Learning Agent:** Create an autonomous algorithmic agent (e.g., Monte Carlo evaluation or a heuristic-driven state machine) capable of playing the game. The agent must make decisions on:
    * Which contracts to accept (evaluating risk/reward, travel costs, and local veil pressure).
    * Which equipment/upgrades to purchase and when to study essence samples.
    * How to place counters during the encounter loop based on scan probabilities and the generated intel.
4. **Simulate at Scale:** Run the agent through at least 1,000 different game seeds. Each run should attempt to reach day 100 or stop when bankruptcy/max veil pressure is reached.
5. **Identify Bottlenecks:** Generate a diagnostic report detailing:
    * Win/Loss ratios and average survival days.
    * Primary causes of game over (e.g., lack of Ätherkredite vs. global veil pressure hitting 100).
    * Equipment, mechanics, or room upgrades that the agent mathematically ignores because they are not cost-effective.
    * Specific difficulty spikes (e.g., transition to variant ghosts or specific environmental hazards).
6. **Apply Automated Balancing Fixes:** Based on the diagnostic data, automatically modify the balancing parameters in `data.js` (e.g., tweak base payouts, adjust collateral penalties, reduce tier 1 equipment costs, or soften the veil pressure escalation). Update `ECONOMY.md` to reflect your new mathematical baseline.