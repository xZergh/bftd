import { AutomationStatusBadge, AutomationStatusSelect } from "./AutomationStatusBadge";
import { AllureStepsReadable, AUTOMATION_UI_SAMPLE_STEPS } from "./AllureStepsReadable";

type Props = {
  onClose: () => void;
};

export function AutomationUiSample({ onClose }: Props) {
  return (
    <div className="automation-inspector" data-testid="automation-ui-sample-panel">
      <div className="detail-panel-header">
        <div className="detail-panel-header-actions">
          <button type="button" className="detail-panel-close" onClick={onClose} data-testid="automation-sample-close">
            Close
          </button>
        </div>
      </div>

      <section className="automation-ui-sample" data-testid="automation-ui-sample" aria-label="Automation UI sample">
        <header className="automation-ui-sample-header">
          <h3 className="projects-subheading">UI sample (placeholder)</h3>
          <p className="automation-ui-sample-hint">
            Static preview for tuning layout — not live data. Select a real row in Coverage to inspect project test cases.
          </p>
        </header>

        <div className="automation-ui-sample-grid">
          <div className="automation-ui-sample-card">
            <h4>Manual coverage</h4>
            <table className="projects-table projects-table--dense">
              <thead>
                <tr>
                  <th scope="col">Key</th>
                  <th scope="col">Title</th>
                  <th scope="col">Automation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>TCMS-TC-R1-05</code>
                  </td>
                  <td>Manual: archived project hidden from default list</td>
                  <td>
                    <AutomationStatusBadge status="automation_required" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>TCMS-TC-R1-01</code>
                  </td>
                  <td>Manual: create project with unique key</td>
                  <td>
                    <AutomationStatusBadge status="in_progress" />
                  </td>
                </tr>
              </tbody>
            </table>
            <label className="automation-ui-sample-field">
              Automation status
              <AutomationStatusSelect value="automation_required" disabled onChange={() => undefined} />
            </label>
          </div>

          <div className="automation-ui-sample-card">
            <h4>Automated steps (Allure-style)</h4>
            <p className="automation-ui-sample-meta">
              <code>fe-projects-archive.spec.ts</code> · linked to <code>TCMS-TC-R1-05</code>
            </p>
            <AllureStepsReadable steps={AUTOMATION_UI_SAMPLE_STEPS} />
          </div>
        </div>
      </section>
    </div>
  );
}
