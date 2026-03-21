# 🚀 Orbital Guardian - Hackathon Prep Guide

This guide contains everything you need to know to confidently present **Orbital Guardian** to the judges, explain your technical choices, and defend the algorithms used in the project.

---

## 🏗️ 1. Architecture & Tech Stack Choices

Judges love knowing *why* you picked your tools. 

### **Frontend: React + Three.js**
*   **Why React?** The dashboard is heavily state-driven (tracking multiple pipeline stages, updating UI based on collision risks). React makes managing this complex state easy.
*   **Why Three.js (WebGL)?** Rendering thousands of orbital paths and satellites in 3D requires hardware acceleration. Standard DOM elements would crash the browser; WebGL handles it at 60fps.
*   **Why Three.js over CesiumJS?** CesiumJS is fantastic for GIS (Geographic Information Systems) and terrain mapping, but it is very strictly bound to geographical data and can become heavy/sluggish for purely abstract space visualizations. Three.js gives us lower-level WebGL control, allowing us to build a custom, highly performant rendering pipeline specifically tuned to draw thousands of glowing orbits and satellite meshes at 60fps without the overhead of Cesium's massive terrain engines.

### **Backend: FastAPI (Python)**
*   **Why Python?** Space physics libraries (`sgp4`) and heavy math tools (`numpy`) are robust and native to Python. 
*   **Why FastAPI instead of Flask/Django?** FastAPI is incredibly fast because it's asynchronous by default. It also auto-generates documentation, which is great for building APIs quickly in a hackathon setting.

### **Deployment: Vercel & Render**
*   **Vercel** handles the static frontend asset delivery globally via CDN.
*   **Render** hosts the Python backend, allowing it to dynamically compute heavy physics calculations on demand.

---

## 🪐 2. The Core Physics: How does it actually work?

### **A. Orbital Propagation (SGP4)**
*   **What is SGP4?** SGP4 stands for Simplified General Perturbations-4. It is the mathematical algorithm used by NASA and NORAD to calculate the position and velocity of an Earth-orbiting object. Inputting a satellite's TLE (Two-Line Element set) into SGP4 gives you its coordinates at any given time.
*   **How does SGP4 work?** Unlike basic Keplerian orbits which assume Earth is a perfect point-mass, SGP4 accounts for *perturbations*. It mathematical models factors like:
    1.  **Earth's Oblateness ($J_2$ effect):** The Earth bulges at the equator, causing the gravitational field to be uneven.
    2.  **Atmospheric Drag:** Even in Low Earth Orbit (LEO), there is trace atmosphere that slows satellites down.
    3.  **Luni-solar gravity:** The gravitational pull of the Moon and the Sun.
*   **Judge Question: *"Why use SGP4 instead of simple Keplerian math?"***
    *   **Answer:** "Simple Kepler orbits drift by kilometres over 24 hours. Because we need precision to detect collision risks under 10km, we *must* use SGP4 to model perturbations like atmospheric drag and Earth's equatorial bulge. It is the industry standard for TLE propagation."

### **B. Collision Detection (The Algorithm & Math)**
*   **How do you calculate Miss Distance?**
    1.  We propagate the orbits of Satellite A and Satellite B over a set time window (e.g., 24 hours) using discrete time-steps (e.g., every 10 mins).
    2.  At every step, we get a 3D Cartesian position vector (X, Y, Z coordinates in the TEME frame) for both objects. 
    3.  We calculate the **Euclidean Distance** between the two vectors: `distance = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)`.
    4.  The smallest distance found over the propagation window is the minimum separation, or "Miss Distance". 
*   **Risk Thresholds:** 
    *   **CRITICAL:** < 10 km separation.
    *   **WARNING:** < 50 km separation.
*   **Explain the $O(N^2)$ algorithm and ways to improve it:**
    *   Currently, to check every satellite against every other satellite, we do an all-to-all pairwise comparison. If there are $N$ satellites, there are $\frac{N(N-1)}{2}$ pairs, which is an $O(N^2)$ time complexity. This does not scale well to 30,000+ objects.
    *   **How to improve it (Spatial Partitioning):** To scale this, we would implement **Octrees** or **3D K-D Trees**. We would divide the space around Earth into 3D grid sectors (voxels). We only need to compute the exact distance for satellites passing through the *same or adjacent sectors*. This drastically cuts down the number of checks, moving performance closer to $O(N \log N)$. 

### **C. The "AI" Maneuver Engine (Math & Delta-V)**
*   **How it works:** Instead of blinding AI black boxes, we use a physics-informed deterministic engine utilizing vector calculus.
*   **Direction of Burn (The Cross Product):**
    1.  We take the threatened satellite's **Velocity Vector** ($V$).
    2.  We take the **Threat Direction Vector** ($T$) pointing from the satellite to the debris.
    3.  We calculate the **Cross Product**: $\hat{B} = \frac{\vec{V} \times \vec{T}}{||\vec{V} \times \vec{T}||}$.
    4.  This yields a **Cross-Track Burn**. 
*   **Judge Question: *"Why calculate a cross-track burn instead of speeding up/slowing down?"***
    *   **Answer:** "A pure prograde burn (speeding up) changes the satellite's orbital energy and altitude, harming its mission profile. A **cross-track burn** (perpendicular to velocity) simply tilts the orbital plane slightly. It dodges the debris while conserving orbital energy and minimizing the change to its operational orbit."
*   **Delta-v ($\Delta v$) Calculation:** Delta-V is the change in velocity required to perform a maneuver. We dynamically scale $\Delta v$ inversely to the current miss distance. An imminent threat (< 1km) requires an aggressive $\Delta v$ of ~5 m/s. A distant threat requires only a gentle 0.5 m/s nudge. 
    *   *Linear estimate model:* We assume each $\text{m/s}$ of $\Delta v$ gains roughly $M$ km of miss displacement over time, factoring in the time-to-closest-approach.
*   **How you calculate Fuel Cost:** Spacecraft fuel capacity is essentially measured by a total "Delta-V budget" (often ~200 m/s for a standard LEO satellite's lifespan). We calculate the fuel cost as a direct percentage of this total budget. So a 2 m/s burn costs `(2 / 200) * 100 = 1%` of the satellite's total lifetime fuel. 

---

## 🧠 3. Anticipated Judge Questions & Deep Dives

### **Q: Tell me about Kessler Syndrome.**
> "Kessler Syndrome is a theoretical scenario proposed by NASA scientist Donald Kessler in 1978. It describes a tipping point where the density of space debris in LEO becomes so high that one collision generates shrapnel, which immediately strikes other satellites, creating a cascading chain reaction. Eventually, entire orbital bands become completely unusable for generations. Our project is designed to prevent these primary collisions and avoid sparking the syndrome."

### **Q: What is your differentiator? / Why build this?**
> **Why Build This?** Space is more congested than ever. With mega-constellations like Starlink launching thousands of satellites, space traffic management is becoming a critical infrastructure issue.
> **Differentiator:** Most existing space traffic tools are either clunky government legacy systems or command-line scripts for astrodynamicists. **Orbital Guardian** translates complex physics into an intuitive, high-performance UI. Furthermore, we don't just alert operators to collisions—our physics-informed engine actually calculates the optimal maneuver options, balancing fuel efficiency against safety. It acts as an expert advisor.

### **Q: How accurate is your collision prediction?**
> "For a hackathon MVP, our accuracy is restricted by the TLE format. TLEs from Celestrak are historical snapshot averages and do not contain covariance (probability data). We propagate them using SGP4, which is mathematically sound for about 24-48 hours. However, in a real-world scenario, we would ingest CDMs (Conjunction Data Messages) which contain precise state vectors and 3x3 covariance matrices to calculate the actual *Probability of Collision (Pc)* rather than just a raw distance."

### **Q: What would you do with 6 more months?**
> 1.  **Algorithms:** Replace the $O(N^2)$ collision scanner with K-D trees for real-time fleet-wide scaling.
> 2.  **Data Ingestion:** Move beyond TLEs to use Conjunction Data Messages (CDMs) to calculate probabilistic risk (Pc).
> 3.  **Space Weather:** Integrate live solar flux data (e.g., F10.7 index) because solar storms expand Earth's atmosphere, drastically increasing atmospheric drag and changing orbital paths unpredictably.

### **Q: Who is this for?**
> "Our target users are **Satellite Operators** (commercial spaceflight companies managing fleets), **Space Agencies** monitoring national assets, and **Space Traffic Management** regulatory bodies who need a clear, visual command-and-control dashboard to manage congestion and compliance."

### **Q: What kind of coordinate system do you use?**
> "The SGP4 library outputs positions in **TEME** (True Equator, Mean Equinox), which is an Earth-centered inertial (ECI) coordinate frame. The origin is the center of the Earth, the Z-axis points to the North Pole, and the X/Y axes lie on the equatorial plane. We convert TEME distances directly to determine separation, and convert them to geodetic (Lat/Lon/Alt) to plot them on the 3D globe."

### **Q: How do you handle edge cases, like a direct head-on collision where a cross-track burn isn't enough?**
> "Our Maneuver Engine provides trade-offs. If a cross-track burn doesn't offer enough clearance, the engine recommends a 'Max Separation' burn (which costs significantly more fuel). If the threat is virtually instantaneous and velocity vectors align severely, we provide an 'Emergency Radial Burn' (firing thrusters directly toward or away from Earth) to instantly disrupt the geometry of the encounter, saving the satellite at the cost of high fuel and mission disruption."

---

## 🎯 4. Presentation Tips

1.  **Start with the "Why":** Open with Kessler Syndrome and the exponential growth of Starlink/mega-constellations.
2.  **Highlight the Visuals:** Spin the 3D globe, show the overlapping red and orange orbital paths.
3.  **Explain the Trade-offs:** Show the Maneuver Panel UI. Explain to the judges: *"We don't just tell the operator what to do. We give them options based on Fuel vs Safety. A cross-track burn saves orbital energy, while a radial burn is for emergencies."* This proves maturity in engineering design. 

Good luck! You've built a genuinely complex, physics-accurate dashboard. Let the tech speak for itself.

---

## 💡 5. Concrete Examples to Explain to Judges

Presenting raw math to judges can be dry. Use these exact, concrete analogies and example numbers when explaining how your physics engine works:

### **Example 1: How SGP4 is Used in Your App**
**The Scenario:** You receive a TLE (Two-Line Element) for *Satellite A (Aura)*. A TLE is just a snapshot of an orbit at a specific moment in time (an 'epoch'). 
**The Problem:** If you just use simple math ($V = D/T$) to guess where Aura will be 24 hours from now, your answer will be wrong by kilometers because the Earth is bulging at the equator (throwing off gravity) and the thermosphere is dragging on the satellite.
**The SGP4 Solution:** 
1. The app feeds the Aura TLE into the Python `sgp4` library. 
2. We ask it: *"Where is Aura exactly 24 hours from now?"*
3. The SGP4 algorithm runs hundreds of mathematical perturbation models (modelling the specific shape of the Earth and atmospheric drag).
4. **The Output:** It gives us an exact 3D Cartesian coordinate in space: `X: 4500km, Y: -2000km, Z: 5100km`. We do this for every 10-minute interval across 24 hours to trace the exact path the satellite will take.

### **Example 2: Direction of Burn (The Cross Product)**
**The Scenario:** *Satellite A* is flying horizontally forward at 7.5 km/s. A piece of *Debris* is coming down from above, threatening to T-bone it.
**The Problem:** If the operator panics and just fires the main thrusters backwards (Retrograde burn) to hit the brakes, *Satellite A* will slow down. In orbital mechanics, if you slow down, you drop in altitude. We've avoided the debris, but now the satellite is falling out of its mission orbit.
**Our Engine's Solution (Cross-Track Burn):** 
1. Our engine takes the satellite's **Velocity Vector** (pointing forward: `[1, 0, 0]`).
2. It takes the **Threat Vector** (the direction the debris is coming from, e.g., straight down: `[0, 1, 0]`).
3. It calculates the **Cross Product** of these two. The cross product of "Forward" and "Down" is "Left" (`[0, 0, 1]`).
4. **The Output:** The engine tells the operator: *"Fire your side thrusters to push the satellite to the Left."* This tilts the orbital plane slightly out of the way of the debris without changing the satellite's forward speed or altitude. The mission is saved.

### **Example 3: Delta-V ($\Delta v$) and Fuel Cost**
**The Scenario:** You need to perform the avoidance maneuver we just calculated.
**The Problem:** In space, there are no gas stations. Satellites carry a fixed amount of fuel for their entire 10-year lifespan. This is measured as a total "Delta-V Budget", usually around $\Delta v = 200\text{ m/s}$. Every maneuver permanently spends some of this budget.
**Our Engine's Solution:** 
1. Our engine looks at the Miss Distance. If the debris is passing at a terrifyingly close **1 km**, we need an aggressive, hard shove. The engine recommends a burn of **$\Delta v = 5.0\text{ m/s}$**.
2. **Fuel Cost Calculation:** We take that required $\Delta v$ and divide it by the satellite's lifetime budget: `(5.0 / 200.0) * 100 = 2.5%`. 
3. **The Output:** The UI warns the operator: *"This aggressive emergency maneuver will consume 2.5% of the satellite's entire lifetime fuel."* If the debris is further away (e.g., 40 km), the engine only recommends a microscopic nudge of **$\Delta v = 0.5\text{ m/s}$**, costing barely **0.25%** of the fuel. This proves to judges that we treat space assets realistically.
