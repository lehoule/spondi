"use client";

import { Icon } from "./Icons";
import { Modal } from "./Modal";

const urgentSigns = [
  "Sudden one-sided weakness, facial droop, speech change, or major vision change",
  "Rapidly worsening weakness, numbness, or imbalance",
  "New numbness around the groin, genitals, or buttocks",
  "New trouble controlling or emptying the bladder or bowel",
  "Difficulty swallowing or breathing",
  "New severe neck or back pain after a fall, collision, or other trauma",
];

export function SafetyPanel({ onClose }: { onClose: () => void }) {
  return (
    <Modal eyebrow="Safety guide" onClose={onClose} title="Know when not to log and wait">
      <div className="safety-lead">
        <span className="safety-lead__icon">
          <Icon name="alert" size={22} />
        </span>
        <div>
          <h3>Seek emergency care now</h3>
          <p>
            If any of these are new or suddenly worsening, stop using the app
            and contact local emergency services.
          </p>
        </div>
      </div>

      <ul className="safety-list">
        {urgentSigns.map((sign) => (
          <li key={sign}>
            <Icon name="check" size={17} />
            <span>{sign}</span>
          </li>
        ))}
      </ul>

      <div className="notice notice--amber">
        <Icon name="eye" />
        <div>
          <strong>Same-day eye assessment</strong>
          <p>
            Eye pain or redness with light sensitivity or blurred vision needs
            prompt, same-day assessment.
          </p>
        </div>
      </div>

      <div className="notice">
        <Icon name="info" />
        <div>
          <strong>Driving boundary</strong>
          <p>
            Do not drive while pedal control or sensation is unreliable. Never
            provoke symptoms on purpose to complete a record.
          </p>
        </div>
      </div>

      <div className="source-links">
        <p>Clinical source links</p>
        <a
          href="https://www.nice.org.uk/guidance/ng127/chapter/Recommendations-for-adults-aged-over-16"
          rel="noreferrer"
          target="_blank"
        >
          NICE neurological referral guidance
          <span aria-hidden="true">↗</span>
        </a>
        <a
          href="https://www.nice.org.uk/guidance/NG65/chapter/Recommendations"
          rel="noreferrer"
          target="_blank"
        >
          NICE spondyloarthritis guidance
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </Modal>
  );
}
