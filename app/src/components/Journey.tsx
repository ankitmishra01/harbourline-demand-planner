/** "Where this fits": the discovery, pilot and rollout journey, with the current step highlighted. */
export default function Journey({ here }: { here: "discovery" | "pilot" | "rollout" }) {
  return (
    <div className="journey" aria-label="Where this prototype fits in the plan">
      <div className={`bp ${here === "discovery" ? "here" : ""}`}>
        <strong>Discovery · 7 weeks, 3 checkpoints{here === "discovery" && <span className="here-tag">THIS PAGE</span>}</strong>
        <span className="muted">Week 2: can we tell lost demand from empty shelves? · Week 5: does a model beat the baseline? · Week 7: do the numbers justify going ahead?</span>
      </div>
      <div className={`pi ${here === "pilot" ? "here" : ""}`}>
        <strong>Pilot · 20 to 30 stores{here === "pilot" && <span className="here-tag">THIS SCREEN</span>}</strong>
        <span className="muted">Shadow mode for 4 to 6 weeks: suggestions run alongside current ordering without changing orders.</span>
      </div>
      <div className={`ro ${here === "rollout" ? "here" : ""}`}>
        <strong>Rollout · all 300 stores</strong>
        <span className="muted">Only if real profit clears $0.70M a year. Then $0.25M a year to run it.</span>
      </div>
    </div>
  );
}
