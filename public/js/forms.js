// ===== Nexora CheckSheet — Form Renderers & Collectors =====

const FormRenderers = {
  // Helper: generate a <select> for signature fields
  _sigSelect(id, users, defaultName) {
    const opts = (users && users.length) ? users.map(u =>
      `<option value="${u.name}"${u.name === defaultName ? ' selected' : ''}>${u.name} (${u.role || u.employee_id})</option>`
    ).join('') : `<option value="${defaultName||''}" selected>${defaultName||'—'}</option>`;
    return `<select id="${id}" class="sig-select" data-sig-field="${id}" style="width:100%">${opts}</select>`;
  },

  // Helper: generate signature section HTML
  _sigSection(fields, users, currentUser) {
    const grid = fields.map(f =>
      `<div class="form-group"><label>${f.label}</label>${this._sigSelect(f.id, users, currentUser?.name || '')}</div>`
    ).join('');
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="pen-tool"></i> Signatures</div><div class="form-section-grid">${grid}</div></div>`;
  },

  // --- PDI ---
  renderPDIForm(currentUser, users) {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General Information</div><div class="form-section-grid">
      <div class="form-group"><label>Date of Inspection</label><input type="date" id="pdi-date" required></div>
      <div class="form-group"><label>Work Order No.</label><input type="text" id="pdi-wo" placeholder="W72600095" required></div>
      <div class="form-group"><label>Customer</label><input type="text" id="pdi-customer" placeholder="Polyglass" required></div>
      <div class="form-group"><label>PO Number</label><input type="text" id="pdi-po"></div>
      <div class="form-group"><label>Color</label><input type="text" id="pdi-color" placeholder="Black and Green"></div>
      <div class="form-group"><label>Qty Dispatch</label><input type="text" id="pdi-qty" placeholder="48 Rolls"></div>
    </div></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="list"></i> Roll Inspection Details</div><div id="pdi-rolls">${this._pdiRollHTML(1)}</div><button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addPDIRoll()"><i data-lucide="plus"></i> Add Another Roll</button></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="check-square"></i> Requirements</div><div class="form-section-grid">
      <div class="form-group"><label>Weight Range (kg)</label><input type="text" id="pdi-req-weight" placeholder="296.8-405.1"></div>
      <div class="form-group"><label>Width Range (CM)</label><input type="text" id="pdi-req-width" placeholder="99.5-101"></div>
      <div class="form-group"><label>GSM Range</label><input type="text" id="pdi-req-gsm" placeholder="152-168"></div>
      <div class="form-group"><label>Dia Range (inch)</label><input type="text" id="pdi-req-dia" placeholder="33.7-38.2"></div>
      <div class="form-group"><label>Thickness Range (mils)</label><input type="text" id="pdi-req-thickness" placeholder="12 to 14"></div>
      <div class="form-group"><label>Pallet Size</label><input type="text" id="pdi-req-pallet" placeholder="900*900*130 cm"></div>
    </div></div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="clipboard-list"></i> Result & Observation</div><div class="form-section-grid">
      <div class="form-group"><label>Result</label><select id="pdi-result"><option value="Accepted">Accepted</option><option value="Accepted under Deviation">Accepted under Deviation</option><option value="Rejected">Rejected</option></select></div>
      <div class="form-group"><label>No. of Deviations</label><input type="number" id="pdi-deviations" placeholder="0"></div>
    </div><div class="form-group"><label>Observation</label><textarea id="pdi-observation" rows="3" placeholder="Enter observations..."></textarea>    </div></div>${this._sigSection([{id:'pdi-inspected-by',label:'Inspected By'},{id:'pdi-approved-by',label:'Approved By'}], users, currentUser)}`;
  },

  _pdiRollHTML(n) {
    return `<div class="form-entry-card" data-index="${n}"><div class="form-entry-header"><i data-lucide="package"></i> Roll ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div><div class="form-section-grid">
      <div class="form-group"><label>Roll Number</label><input type="text" class="pdi-roll-no" placeholder="H26-05-G88A"></div>
      <div class="form-group"><label>Roll Weight (kg)</label><input type="number" step="0.1" class="pdi-roll-weight"></div>
      <div class="form-group"><label>Width (CM)</label><input type="number" step="0.1" class="pdi-roll-width"></div>
      <div class="form-group"><label>Average GSM</label><input type="number" step="0.1" class="pdi-roll-gsm"></div>
      <div class="form-group"><label>Dia of Roll (inch)</label><input type="number" step="0.01" class="pdi-roll-dia"></div>
      <div class="form-group"><label>Thickness (mils)</label><input type="text" class="pdi-roll-thickness" placeholder="12.5-14.5"></div>
      <div class="form-group"><label>Label Verification</label><select class="pdi-roll-label"><option>OK</option><option>Not OK</option></select></div>
      <div class="form-group"><label>Print Matter</label><select class="pdi-roll-print"><option>OK</option><option>Not OK</option></select></div>
      <div class="form-group"><label>Paper Core</label><input type="text" class="pdi-roll-core" placeholder="1015*15"></div>
    </div></div>`;
  },

  // --- Inprocess ---
  renderInprocessForm(currentUser, users) {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General</div><div class="form-section-grid">
      <div class="form-group"><label>Date</label><input type="date" id="ip-date" required></div>
      <div class="form-group"><label>Shift</label><select id="ip-shift"><option>Morning</option><option>Afternoon</option><option>Night</option></select></div>
      <div class="form-group"><label>Doc Reference</label><input type="text" id="ip-docref" value="TF/QAD/15 Rev 00"></div>
    </div></div>
    <div class="form-section" id="ip-entries"><div class="form-section-title"><i data-lucide="list"></i> Fabric Inspection Entries</div>
      ${[1].map(n => this._inprocessEntryHTML(n)).join('')}
      <button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addInprocessEntry()"><i data-lucide="plus"></i> Add Another Entry</button>
    </div>${this._sigSection([{id:'ip-prepared',label:'Prepared By'},{id:'ip-verified',label:'Verified By'},{id:'ip-approved',label:'Approved By'}], users, currentUser)}`;
  },

  _inprocessEntryHTML(n) {
    return `<div class="form-entry-card" data-entry="${n}"><div class="form-entry-header"><i data-lucide="factory"></i> Entry ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div><div class="form-section-grid">
      <div class="form-group"><label>Loom / Roll No.</label><input type="text" class="ip-loom" placeholder="Loom or Roll identifier"></div>
      <div class="form-group"><label>Work Order (W/O)</label><input type="text" class="ip-wo" placeholder="W72600098"></div>
      <div class="form-group"><label>Particulars</label><select class="ip-particulars"><option>Standard</option><option>Actual</option></select></div>
      <div class="form-group"><label>Fabric Code</label><input type="text" class="ip-fcode" placeholder="e.g. RF-001"></div>
      <div class="form-group"><label>Width (CM)</label><input type="number" step="0.1" class="ip-width" placeholder="100.5"></div>
      <div class="form-group"><label>Mesh</label><input type="text" class="ip-mesh" placeholder="e.g. 10x10"></div>
      <div class="form-group"><label>Warp Strength (kgf)</label><input type="number" step="0.1" class="ip-warp-str" placeholder="120"></div>
      <div class="form-group"><label>Weft Strength (kgf)</label><input type="number" step="0.1" class="ip-weft-str" placeholder="95"></div>
      <div class="form-group"><label>GSM Required</label><input type="number" step="0.1" class="ip-gsm-req" placeholder="160"></div>
      <div class="form-group"><label>GSM Actual</label><input type="number" step="0.1" class="ip-gsm-act" placeholder="162"></div>
      <div class="form-group"><label>Colour Code</label><input type="text" class="ip-colour" placeholder="Black"></div>
      <div class="form-group"><label>Remarks</label><input type="text" class="ip-remarks" placeholder="Any observations"></div>
    </div></div>`;
  },

  // --- Tape Plant ---
  renderTapeForm(currentUser, users) {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General</div><div class="form-section-grid">
      <div class="form-group"><label>Plant No.</label><input type="text" id="tp-plant" required></div>
      <div class="form-group"><label>Date</label><input type="date" id="tp-date" required></div>
      <div class="form-group"><label>PP Grade</label><input type="text" id="tp-pp-grade"></div>
      <div class="form-group"><label>PP Lot No.</label><input type="text" id="tp-pp-lot"></div>
      <div class="form-group"><label>UV Grade</label><input type="text" id="tp-uv-grade"></div>
      <div class="form-group"><label>Technician</label><input type="text" id="tp-technician"></div>
    </div></div>
    <div class="form-section" id="tp-samples"><div class="form-section-title"><i data-lucide="list"></i> Extruder Sample Data</div>
      ${[1,2,3,4,5].map(n => this._tapeSampleHTML(n)).join('')}
      <button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addTapeSample()"><i data-lucide="plus"></i> Add Another Sample</button>
    </div>
    <div class="form-section"><div class="form-section-title"><i data-lucide="settings"></i> Machine Parameters</div><div class="form-section-grid">
      <div class="form-group"><label>Speed</label><input type="text" id="tp-speed"></div>
      <div class="form-group"><label>Temperature</label><input type="text" id="tp-temp"></div>
      <div class="form-group"><label>Screw RPM</label><input type="number" id="tp-screw-rpm"></div>
      <div class="form-group"><label>Godet-I</label><input type="text" id="tp-godet1"></div>
      <div class="form-group"><label>Barrel</label><input type="text" id="tp-barrel"></div>
      <div class="form-group"><label>Die</label><input type="text" id="tp-die"></div>
      <div class="form-group"><label>Stretch Ratio</label><input type="text" id="tp-stretch"></div>
      <div class="form-group"><label>Annealing %</label><input type="text" id="tp-anneal-pct"></div>
    </div></div>${this._sigSection([{id:'tp-prepared',label:'Prepared By'},{id:'tp-checked',label:'Checked By'}], users, currentUser)}`;
  },

  _tapeSampleHTML(n) {
    return `<div class="form-entry-card" data-sample="${n}"><div class="form-entry-header"><i data-lucide="hash"></i> Sample ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div><div class="form-section-grid">
      <div class="form-group"><label>Denier</label><input type="number" step="0.1" class="tp-denier" placeholder="1500"></div>
      <div class="form-group"><label>Width (mm)</label><input type="number" step="0.1" class="tp-width" placeholder="25"></div>
      <div class="form-group"><label>Strength (kgf)</label><input type="number" step="0.1" class="tp-strength" placeholder="18"></div>
      <div class="form-group"><label>Elongation (%)</label><input type="number" step="0.1" class="tp-elongation" placeholder="12"></div>
    </div></div>`;
  },

  // --- Lamination ---
  renderLaminationForm(currentUser, users) {
    return `<div class="form-section"><div class="form-section-title"><i data-lucide="info"></i> General</div><div class="form-section-grid">
      <div class="form-group"><label>Date</label><input type="date" id="lm-date" required></div>
      <div class="form-group"><label>Shift</label><select id="lm-shift"><option>Morning</option><option>Afternoon</option><option>Night</option></select></div>
      <div class="form-group"><label>Doc Reference</label><input type="text" id="lm-docref" value="TF/QAD/11 REV:01"></div>
    </div></div>
    <div class="form-section" id="lm-entries"><div class="form-section-title"><i data-lucide="list"></i> Roll Inspection Entries</div>
      ${[1,2].map(n => this._laminationEntryHTML(n)).join('')}
      <button type="button" class="btn btn-outline btn-sm" style="margin-top:14px" onclick="App.addLaminationEntry()"><i data-lucide="plus"></i> Add Another Roll</button>
    </div>${this._sigSection([{id:'lm-checked',label:'Checked By'},{id:'lm-approved',label:'Approved By'}], users, currentUser)}`;
  },

  _laminationEntryHTML(n) {
    return `<div class="form-entry-card" data-roll="${n}"><div class="form-entry-header"><i data-lucide="package"></i> Roll ${n}<button type="button" class="btn btn-danger btn-xs" onclick="this.closest('.form-entry-card').remove()"><i data-lucide="trash-2"></i> Remove</button></div>
      <div class="form-section-grid">
        <div class="form-group"><label>Roll No.</label><input type="text" class="lm-roll" placeholder="H26-08-G001"></div>
        <div class="form-group"><label>Customer</label><input type="text" class="lm-customer" placeholder="Customer name"></div>
        <div class="form-group"><label>Thickness (mm)</label><input type="text" class="lm-thickness" placeholder="0.5"></div>
        <div class="form-group"><label>Required GSM</label><input type="number" step="0.1" class="lm-req-gsm" placeholder="160"></div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--gray-200)"><div style="font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">GSM Readings (4 Points)</div><div class="form-section-grid">
        <div class="form-group"><label>GSM Point 1</label><input type="number" step="0.1" class="lm-gsm1" placeholder="158"></div>
        <div class="form-group"><label>GSM Point 2</label><input type="number" step="0.1" class="lm-gsm2" placeholder="162"></div>
        <div class="form-group"><label>GSM Point 3</label><input type="number" step="0.1" class="lm-gsm3" placeholder="160"></div>
        <div class="form-group"><label>GSM Point 4</label><input type="number" step="0.1" class="lm-gsm4" placeholder="161"></div>
        <div class="form-group"><label>Average GSM</label><input type="number" step="0.1" class="lm-avg-gsm" placeholder="160.3"></div>
      </div></div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--gray-200)"><div style="font-size:0.75rem;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Strength & COF</div><div class="form-section-grid">
        <div class="form-group"><label>Peel Strength (N/cm)</label><input type="number" step="0.1" class="lm-peel" placeholder="12"></div>
        <div class="form-group"><label>Warp Tear (N)</label><input type="number" step="0.1" class="lm-warp-tear" placeholder="45"></div>
        <div class="form-group"><label>Weft Tear (N)</label><input type="number" step="0.1" class="lm-weft-tear" placeholder="40"></div>
        <div class="form-group"><label>COF — Kinetic</label><input type="number" step="0.01" class="lm-cof-kin" placeholder="0.35"></div>
        <div class="form-group"><label>COF — Static</label><input type="number" step="0.01" class="lm-cof-stat" placeholder="0.42"></div>
      </div></div>
    </div>`;
  },
};

// ===== Data Collectors =====
const FormCollectors = {
  collectPDI() {
    const rolls = [];
    document.querySelectorAll('#pdi-rolls .form-entry-card').forEach(e => {
      rolls.push({
        roll_number: gq(e, '.pdi-roll-no'),
        roll_weight: gq(e, '.pdi-roll-weight'),
        width: gq(e, '.pdi-roll-width'),
        avg_gsm: gq(e, '.pdi-roll-gsm'),
        dia: gq(e, '.pdi-roll-dia'),
        thickness: gq(e, '.pdi-roll-thickness'),
        label_ok: gq(e, '.pdi-roll-label'),
        print_ok: gq(e, '.pdi-roll-print'),
        paper_core: gq(e, '.pdi-roll-core'),
      });
    });
    return {
      date: gv('pdi-date'), wo_no: gv('pdi-wo'), customer: gv('pdi-customer'),
      po_no: gv('pdi-po'), color: gv('pdi-color'), qty_dispatch: gv('pdi-qty'),
      requirements: {
        weight: gv('pdi-req-weight'), width: gv('pdi-req-width'), gsm: gv('pdi-req-gsm'),
        dia: gv('pdi-req-dia'), thickness: gv('pdi-req-thickness'), pallet: gv('pdi-req-pallet'),
      },
      rolls, result: gv('pdi-result'), deviations: gv('pdi-deviations'),
      observation: gv('pdi-observation'),
      inspected_by: gv('pdi-inspected-by'), approved_by: gv('pdi-approved-by'),
    };
  },

  collectInprocess() {
    const rows = [];
    document.querySelectorAll('#ip-entries .form-entry-card').forEach(card => {
      rows.push({
        loom: gq(card, '.ip-loom'), wo: gq(card, '.ip-wo'),
        particulars: gq(card, '.ip-particulars'), fabric_code: gq(card, '.ip-fcode'),
        width: gq(card, '.ip-width'), mesh: gq(card, '.ip-mesh'),
        warp_strength: gq(card, '.ip-warp-str'), weft_strength: gq(card, '.ip-weft-str'),
        gsm_required: gq(card, '.ip-gsm-req'), gsm_actual: gq(card, '.ip-gsm-act'),
        colour_code: gq(card, '.ip-colour'), remarks: gq(card, '.ip-remarks'),
      });
    });
    return {
      date: gv('ip-date'), shift: gv('ip-shift'), doc_ref: gv('ip-docref'),
      rows, prepared_by: gv('ip-prepared'), verified_by: gv('ip-verified'),
      approved_by: gv('ip-approved'),
    };
  },

  collectTapePlant() {
    const samples = [];
    document.querySelectorAll('#tp-samples .form-entry-card').forEach(card => {
      samples.push({
        denier: gq(card, '.tp-denier'), width: gq(card, '.tp-width'),
        strength: gq(card, '.tp-strength'), elongation: gq(card, '.tp-elongation'),
      });
    });
    return {
      plant_no: gv('tp-plant'), date: gv('tp-date'), pp_grade: gv('tp-pp-grade'),
      uv_grade: gv('tp-uv-grade'), technician: gv('tp-technician'),
      samples,
      machine: {
        speed: gv('tp-speed'), temp: gv('tp-temp'), screw_rpm: gv('tp-screw-rpm'),
        godet1: gv('tp-godet1'), barrel: gv('tp-barrel'), die: gv('tp-die'),
        stretch_ratio: gv('tp-stretch'), anneal_pct: gv('tp-anneal-pct'),
      },
      prepared_by: gv('tp-prepared'), checked_by: gv('tp-checked'),
    };
  },

  collectLamination() {
    const rows = [];
    document.querySelectorAll('#lm-entries .form-entry-card').forEach(card => {
      rows.push({
        roll_no: gq(card, '.lm-roll'), customer: gq(card, '.lm-customer'),
        thickness: gq(card, '.lm-thickness'), req_gsm: gq(card, '.lm-req-gsm'),
        gsm_values: [1,2,3,4].map(n => gq(card, `.lm-gsm${n}`)).filter(Boolean),
        avg_gsm: gq(card, '.lm-avg-gsm'),
        peel_strength: gq(card, '.lm-peel'), warp_tear: gq(card, '.lm-warp-tear'),
        weft_tear: gq(card, '.lm-weft-tear'),
        cof_kinetic: gq(card, '.lm-cof-kin'), cof_static: gq(card, '.lm-cof-stat'),
      });
    });
    return {
      date: gv('lm-date'), shift: gv('lm-shift'), doc_ref: gv('lm-docref'),
      rows, checked_by: gv('lm-checked'), approved_by: gv('lm-approved'),
    };
  },
};
