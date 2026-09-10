// --------------------------------------------------------------------------------
// FieldITechMultifunctionCard (Intégration complète : Titre, Entités, Barres Multiples, Boutons & Alertes Multiples) - https://fielditech.com
// --------------------------------------------------------------------------------
function getButtonRows(buttons, cfg) {
  const rows = [];
  let index = 0;
  let rowIndex = 0;
  while (index < buttons.length) {
    const perRow = Math.min(Math.max(parseInt(cfg[`row_per_row_${rowIndex}`]) || 4, 1), 4);
    const rowButtons = buttons.slice(index, index + perRow);
    rows.push({ rowIndex, perRow, startIndex: index, rowButtons });
    index += rowButtons.length;
    rowIndex++;
  }
  return rows;
}

class FieldITechMultifunctionCard extends HTMLElement {
  static ICON_BY_DEVICE_CLASS = {
    temperature: "mdi:thermometer",
    humidity: "mdi:water-percent",
    battery: "mdi:battery",
    pressure: "mdi:gauge",
    illuminance: "mdi:brightness-5",
    power: "mdi:flash",
    energy: "mdi:lightning-bolt",
    gas: "mdi:fire",
    water: "mdi:water",
    signal_strength: "mdi:wifi",
    timestamp: "mdi:clock-outline",
    motion: "mdi:motion-sensor",
    occupancy: "mdi:home-account",
    door: "mdi:door",
    window: "mdi:window-closed",
    smoke: "mdi:smoke-detector",
    moisture: "mdi:water",
    co: "mdi:molecule-co",
    co2: "mdi:molecule-co2",
  };

  static ICON_BY_DOMAIN = {
    sensor: "mdi:chart-line",
    binary_sensor: "mdi:radiobox-blank",
    switch: "mdi:toggle-switch",
    light: "mdi:lightbulb",
    climate: "mdi:thermostat",
    cover: "mdi:window-shutter",
    fan: "mdi:fan",
    lock: "mdi:lock",
    media_player: "mdi:cast",
    camera: "mdi:camera",
    person: "mdi:account",
    device_tracker: "mdi:map-marker",
    sun: "mdi:white-balance-sunny",
    weather: "mdi:weather-partly-cloudy",
    vacuum: "mdi:robot-vacuum",
  };

  setConfig(config) {
    if (!config) {
      throw new Error("Configuration invalide");
    }
    let entities = [];
    if (Array.isArray(config.entities)) {
      entities = config.entities;
    } else {
      if (config.top_entity) entities.push({ entity: config.top_entity, icon: config.top_icon || "", color: config.top_color || "#ff9f0a", action: config.top_tap_action || { action: "more-info" } });
      if (config.bottom_entity) entities.push({ entity: config.bottom_entity, icon: config.bottom_entity_icon || config.bottom_icon || "", color: config.bottom_color || "#00f2fe", action: config.bottom_tap_action || { action: "more-info" } });
      if (config.third_entity) entities.push({ entity: config.third_entity, icon: config.third_icon || "", color: config.third_color || "#22c55e", action: config.third_tap_action || { action: "more-info" } });
      if (config.fourth_entity) entities.push({ entity: config.fourth_entity, icon: config.fourth_icon || "", color: config.fourth_color || "#a855f7", action: config.fourth_tap_action || { action: "more-info" } });
    }

    this._config = {
      ...config,
      entities: entities,
      bars: Array.isArray(config.bars) ? config.bars : [],
      buttons: Array.isArray(config.buttons) ? config.buttons : []
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 7;
  }

  static getStubConfig() {
    return {
      title: "Nouvelle Pièce",
      title_color: "#ffffff",
      title_alignment: "left",
      card_background: "radial-gradient(circle at 50% 0%, #151d2a 0%, #080b11 100%)",
      card_inner_background: "",
      card_border_color: "rgba(0, 242, 254, 0.3)",
      card_neon_effect: true,
      main_layout: "left",
      icon_tap_action: { action: "navigate", navigation_path: "/lovelace/piece" },
      main_icon: "mdi:home",
      presence: "",
      hide_main_icon: false,
      hide_telemetry: false,
      first_layout: "grid",
      entities: [],
      show_bottom_bars: false,
      bars: [],
      show_buttons: false,
      buttons: [],
      show_air_quality: false,
      air_temp_entity: "",
      air_humidity_entity: "",
      show_security_alert: false,
      security_entity: ""
    };
  }

  static getConfigElement() {
    return document.createElement("fielditech-multifunction-card-editor");
  }

  _getDefaultIcon(stateObj) {
    if (!stateObj) return "mdi:information-outline";

    if (stateObj.attributes && stateObj.attributes.icon) {
      return stateObj.attributes.icon;
    }

    const domain = stateObj.entity_id ? stateObj.entity_id.split(".")[0] : "";
    const deviceClass = stateObj.attributes ? stateObj.attributes.device_class : "";

    return (
      (deviceClass && FieldITechMultifunctionCard.ICON_BY_DEVICE_CLASS[deviceClass]) ||
      FieldITechMultifunctionCard.ICON_BY_DOMAIN[domain] ||
      "mdi:power"
    );
  }

  // Résout l'icône d'un élément : icône explicite si fournie, sinon icône déduite de l'entité.
  _resolveIcon(explicitIcon, stateObj) {
    return explicitIcon || this._getDefaultIcon(stateObj);
  }

  // Nom affiché d'un élément (bar/bouton) : nom explicite > friendly_name HA > id d'entité > fallback.
  _resolveName(explicitName, stateObj, entityId, fallback) {
    return explicitName || (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || entityId || fallback;
  }

  _getSmartDefaults(stateObj, bar) {
    let min = bar.min !== undefined && bar.min !== "" && bar.min !== null ? parseFloat(bar.min) : undefined;
    let max = bar.max !== undefined && bar.max !== "" && bar.max !== null ? parseFloat(bar.max) : undefined;

    const unit = stateObj && stateObj.attributes ? (stateObj.attributes.unit_of_measurement || "") : "";
    const deviceClass = stateObj && stateObj.attributes ? (stateObj.attributes.device_class || "") : "";

    if (min === undefined || isNaN(min)) min = 0;

    if (max === undefined || isNaN(max)) {
      if (unit === "°C" || unit === "°F" || deviceClass === "temperature") max = 40;
      else if (unit === "%" || deviceClass === "humidity" || deviceClass === "battery") max = 100;
      else if (unit === "lx" || unit === "lm" || deviceClass === "illuminance") max = 2500;
      else if (unit === "W" || unit === "kW" || deviceClass === "power") max = 3000;
      else max = 100;
    }
    return { min, max };
  }

  _navigate(path) {
    if (!path) return;
    history.pushState(null, "", path);
    const event = new Event("location-changed", {
      bubbles: true,
      composed: true,
    });
    event.detail = { replace: false };
    window.dispatchEvent(event);
  }

  _moreInfo(entityId) {
    if (!entityId) return;
    const event = new Event("hass-more-info", {
      bubbles: true,
      composed: true,
    });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _handleAction(actionConfig, fallbackEntity) {
    if (!actionConfig || actionConfig.action === "none") {
      if (fallbackEntity) {
        this._moreInfo(fallbackEntity);
      }
      return;
    }
    const hass = this._hass;
    const entity = actionConfig.entity || fallbackEntity;
    switch (actionConfig.action) {
      case "navigate":
        this._navigate(actionConfig.navigation_path);
        break;
      case "url":
        if (actionConfig.url_path) {
          window.open(actionConfig.url_path, "_blank");
        }
        break;
      case "more-info":
        this._moreInfo(entity);
        break;
      case "toggle":
        if (entity && hass) {
          const domain = entity.split(".")[0];
          hass.callService(domain, "toggle", {
            entity_id: entity,
          });
        }
        break;
      case "call-service":
      case "perform-action": {
        const actionName = actionConfig.perform_action || actionConfig.service;
        if (actionName && hass) {
          const [domain, service] = actionName.split(".");
          const data = actionConfig.data || actionConfig.service_data || {};
          const target =
            actionConfig.target ||
            (entity ? { entity_id: entity } : undefined);
          hass.callService(domain, service, data, target);
        }
        break;
      }
      default:
        if (entity) {
          this._moreInfo(entity);
        }
        break;
    }
  }

  _formatState(stateObj) {
    if (!stateObj || stateObj.state === "unavailable" || stateObj.state === "unknown") {
      return "N/A";
    }
    const unit = stateObj.attributes.unit_of_measurement || "";
    const parsed = parseFloat(stateObj.state);
    if (!isNaN(parsed)) {
      return `${parsed.toFixed(1)} ${unit}`.trim();
    }
    return `${stateObj.state} ${unit}`.trim();
  }

  _render() {
    if (!this._config) return;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    try {
      this._renderInner();
    } catch (err) {
      console.error("FieldITechMultifunctionCard: erreur de rendu", err);
      this.shadowRoot.innerHTML = `
        <ha-card style="padding: 16px; color: #ef4444; font-size: 13px;">
          Erreur d'affichage FieldITechMultifunctionCard: ${err && err.message ? err.message : "inconnue"}
        </ha-card>
      `;
    }
  }

  _renderInner() {
    const cfg = this._config;
    const hass = this._hass;

    const presenceState =
      hass && cfg.presence ? hass.states[cfg.presence] : undefined;
    const presenceOn = !!(presenceState && presenceState.state === "on");

    const rawSlots = (cfg.entities || []).map((item, index) => ({
      index: index,
      entity: item.entity,
      state: hass && item.entity ? hass.states[item.entity] : undefined,
      icon: item.icon,
      color: item.color || "#00f2fe",
      textColor: item.text_color || item.color || "#00f2fe",
      iconColor: item.icon_color || "#ffffff",
      action: item.action || { action: "more-info" }
    })).filter(item => !!item.entity);

    const hideTelemetry = !!cfg.hide_telemetry;
    const visibleSlots = hideTelemetry ? [] : rawSlots;

    const activeTop = visibleSlots[0] || null;
    const activeBottom = visibleSlots[1] || null;

    const effectiveCount = visibleSlots.length;
    const hasTelemetry = effectiveCount > 0;
    const hideMain = !!cfg.hide_main_icon;

    const alignment = cfg.title_alignment || "left";
    const mainLayout = cfg.main_layout || "left";
    const firstLayout = effectiveCount <= 1 ? "full" : (cfg.first_layout || "grid");
    
    const showBottomBars = !!cfg.show_bottom_bars;
    const bars = cfg.bars || [];

    const showButtons = !!cfg.show_buttons;
    const buttons = cfg.buttons || [];

    // --- CALCUL QUALITÉ DE L'AIR ---
    const showAirQuality = !!cfg.show_air_quality && (cfg.air_temp_entity || cfg.air_humidity_entity);
    let airStatusText = "N/A";
    let airColor = cfg.air_color || "#22c55e";
    let airIcon = cfg.air_icon || "mdi:air-filter";
    let airTitle = cfg.air_title || "Qualité de l'Air";
    let airAdviceText = "Analyse en cours...";

    if (showAirQuality && hass) {
      const tempObj = cfg.air_temp_entity ? hass.states[cfg.air_temp_entity] : undefined;
      const humObj = cfg.air_humidity_entity ? hass.states[cfg.air_humidity_entity] : undefined;
      
      const temp = tempObj ? parseFloat(tempObj.state) : NaN;
      const hum = humObj ? parseFloat(humObj.state) : NaN;
      const currentMonth = new Date().getMonth();
      const isSummer = currentMonth >= 5 && currentMonth <= 8;

      if (!isNaN(temp) && !isNaN(hum)) {
        if (hum < 30 || hum > 75 || temp < 15 || temp > 30) {
          airStatusText = "Mauvaise";
          airColor = cfg.air_color_bad || "#ef4444";
          airAdviceText = hum > 75 ? (isSummer ? "Humidité critique : Aérez brièvement" : "Humidité très haute : Aérez en grand") : "Conditions hors normes";
        } else if ((hum >= 30 && hum < 40) || (hum > 60 && hum <= 75) || temp < 18 || temp > 26) {
          airStatusText = "Moyenne";
          airColor = cfg.air_color_avg || "#f59e0b";
          airAdviceText = "Ajustez la ventilation ou le chauffage";
        } else {
          airStatusText = "Excellente";
          airColor = cfg.air_color || "#22c55e";
          airAdviceText = "Conditions optimales et confortables";
        }
      } else {
        airStatusText = "Données manquantes";
        airColor = "#64748b";
        airAdviceText = "Associez T° et Humidité";
      }
    }

    // --- CALCUL ALERTE SÉCURITÉ & OUVRANTS ---
    const showSecurityAlert = !!cfg.show_security_alert && !!cfg.security_entity;
    let secStatusText = "Sécurisé";
    let secColor = cfg.sec_color || "#22c55e";
    let secIcon = cfg.sec_icon || "mdi:shield-check";
    let secTitle = cfg.sec_title || "Sécurité & Ouvrants";
    let secAdviceText = "Tous les ouvrants sont fermés";

    if (showSecurityAlert && hass && cfg.security_entity) {
      const secObj = hass.states[cfg.security_entity];
      if (!secObj) {
        secStatusText = "Introuvable";
        secColor = "#f59e0b";
        secIcon = "mdi:shield-alert";
        secAdviceText = "Entité de sécurité introuvable";
      } else if (secObj.state === "unavailable" || secObj.state === "unknown") {
        secStatusText = "Indisponible";
        secColor = "#f59e0b";
        secIcon = "mdi:shield-off";
        secAdviceText = "Capteur hors ligne ou injoignable";
      } else {
        const state = secObj.state;
        const deviceClass = secObj.attributes ? secObj.attributes.device_class : "";
        const domain = cfg.security_entity.split(".")[0];

        if (!cfg.sec_icon) {
          if (deviceClass === "door") secIcon = "mdi:door-open";
          else if (deviceClass === "window") secIcon = "mdi:window-open";
          else if (deviceClass === "smoke") secIcon = "mdi:smoke-detector-alert";
          else if (deviceClass === "motion") secIcon = "mdi:motion-sensor";
          else if (deviceClass === "presence") secIcon = "mdi:account-alert";
          else if (domain === "alarm_control_panel") secIcon = "mdi:alarm-light";
          else secIcon = "mdi:alert-circle";
        }

        let isAlert = false;

        if (domain === "alarm_control_panel") {
          isAlert = state !== "disarmed" && state !== "armed_home" && state !== "armed_away";
        } else if (deviceClass === "presence" || deviceClass === "occupancy") {
          isAlert = state === "off"; 
          if (isAlert) secAdviceText = "Aucune présence détectée";
        } else {
          isAlert = (state === "on" || state === "open" || state === "unlocked" || state === "triggered");
        }

        if (isAlert) {
          secStatusText = "Alerte";
          secColor = cfg.sec_color_alert || "#ef4444";
          
          if (deviceClass === "door") secAdviceText = "Porte ouverte détectée";
          else if (deviceClass === "window") secAdviceText = "Fenêtre ouverte détectée";
          else if (deviceClass === "smoke") secAdviceText = "Fumée ou incendie détecté !";
          else if (deviceClass === "motion") secAdviceText = "Mouvement suspect détecté";
          else if (domain === "alarm_control_panel") secAdviceText = `Alarme déclenchée (${state})`;
          else secAdviceText = "Avertissement ou ouvrant ouvert";
        } else {
          secStatusText = "Sécurisé";
          secColor = cfg.sec_color || "#22c55e";
          if (!cfg.sec_icon) secIcon = "mdi:shield-check";
          
          if (deviceClass === "door") secAdviceText = "Porte fermée";
          else if (deviceClass === "window") secAdviceText = "Fenêtre fermée";
          else if (deviceClass === "smoke") secAdviceText = "Aucune fumée détectée";
          else secAdviceText = "État normal et sécurisé";
        }
      }
    }

    let containerClass = "body-container";
    if (hideMain && !hasTelemetry) {
      containerClass = "body-container hidden-all";
    } else if (hideMain && effectiveCount === 1) {
      containerClass = "body-container single-no-icon";
    } else if (hideMain || !hasTelemetry) {
      containerClass = "body-container full-width";
    } else {
      containerClass = `body-container layout-${mainLayout}`;
    }

    let extraHtml = "";
    if (effectiveCount >= 3) {
      const extraItems = visibleSlots.slice(2);
      let i = 0;
      let pairCounter = 0;
      while (i < extraItems.length) {
        const pairLayoutKey = pairCounter === 0 ? "fourth_layout" : `extra_layout_${pairCounter}`;
        const pairLayout = cfg[pairLayoutKey] || "grid";

        const item1 = extraItems[i];
        const item2 = extraItems[i + 1];

        const teleBox = (item) => `
              <div class="tele-box box-${item.index}" id="box-${item.index}" style="border-left: 4px solid ${item.color};">
                <ha-icon icon="${this._resolveIcon(item.icon, item.state)}" style="color: ${item.iconColor};"></ha-icon>
                <span class="value" style="color: ${item.textColor};">${this._formatState(item.state)}</span>
              </div>`;

        if (pairLayout === "full" || !item2) {
          extraHtml += `
            <div class="extra-containers single-item">${teleBox(item1)}
            </div>
          `;
          i += 1;
        } else {
          extraHtml += `
            <div class="extra-containers">${teleBox(item1)}${teleBox(item2)}
            </div>
          `;
          i += 2;
        }
        pairCounter++;
      }
    }

    let buttonsHtml = "";
    if (showButtons && buttons.length > 0) {
      getButtonRows(buttons, cfg).forEach(({ startIndex, rowButtons }) => {
        buttonsHtml += `
          <div class="buttons-row-grid" style="grid-template-columns: repeat(${rowButtons.length}, minmax(0, 1fr));">
            ${rowButtons.map((btn, localIndex) => {
              const globalIndex = startIndex + localIndex;
              const stateObj = hass && btn.entity ? hass.states[btn.entity] : undefined;
              
              let isOn = false;
              let stateText = "Indisponible";
              let btnColor = btn.color || "#00f2fe";

              if (stateObj) {
                const state = stateObj.state;
                isOn = state === "on" || state === "home" || state === "unlocked" || parseFloat(state) > 0;
                
                if (state === "unavailable") {
                  stateText = "Indisponible";
                } else if (state === "on") {
                  stateText = "Allumé";
                } else if (state === "off") {
                  stateText = "Éteint";
                } else {
                  const unit = stateObj.attributes && stateObj.attributes.unit_of_measurement ? stateObj.attributes.unit_of_measurement : "";
                  stateText = `${state} ${unit}`.trim();
                }
              }

              const btnName = this._resolveName(btn.name, stateObj, btn.entity, "Bouton");
              const btnIcon = this._resolveIcon(btn.icon, stateObj);
              
              const btnTextColor = btn.text_color || "#ffffff";
              const btnStateColor = btn.state_color || (isOn ? btnColor : "#9ca3af");
              const btnIconColor = btn.icon_color || (isOn ? btnColor : "#ffffff");
              const customBg = btn.background || "rgba(0, 0, 0, 0.25)";

              return `
                <div class="btn-item ${isOn ? "active" : ""}" id="embedded-btn-${globalIndex}" style="background: ${customBg}; border-color: ${isOn ? btnColor : (btn.border_color || 'rgba(255, 255, 255, 0.12)')};">
                  <div class="btn-content">
                    <ha-icon icon="${btnIcon}" style="color: ${btnIconColor};"></ha-icon>
                    <span class="btn-name" style="color: ${btnTextColor};">${btnName}</span>
                    <span class="btn-state" style="color: ${btnStateColor}; ${isOn ? 'font-weight: 700;' : ''}">${stateText}</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `;
      });
    }

    const hasAnyContentAboveBars = (!hideMain || hasTelemetry);
    const hasAnyContentAboveButtons = (hasAnyContentAboveBars || (showBottomBars && bars.length > 0));
    const hasAnyContentAboveAlerts = (hasAnyContentAboveButtons || (showButtons && buttons.length > 0));

    const cardBg = cfg.card_background || "radial-gradient(circle at 50% 0%, #151d2a 0%, #080b11 100%)";
    const cardBorder = cfg.card_border_color || "rgba(0, 242, 254, 0.3)";
    const useNeon = cfg.card_neon_effect !== false;
    const cardShadow = useNeon 
      ? `0 15px 35px rgba(0,0,0,0.8), 0 0 15px ${cardBorder}, inset 0 1px 1px rgba(255,255,255,0.1)` 
      : `0 15px 35px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.1)`;

    this.shadowRoot.innerHTML = `
      <style>
        ha-card {
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: ${cardBg};
          border-radius: 28px;
          border: 1px solid ${cardBorder};
          box-shadow: ${cardShadow};
          padding: 20px;
          overflow: visible;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 12px;
        }
        .header.align-left { flex-direction: row; }
        .header.align-right { flex-direction: row-reverse; }
        .header.align-center {
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .title {
          font-weight: 900;
          font-size: 21px;
          letter-spacing: 1.5px;
          color: ${cfg.title_color || "#ffffff"};
        }
        .header.align-center .title { text-align: center; }
        .badge {
          display: flex;
          align-items: center;
          background: rgba(0, 242, 254, 0.12);
          border: 1px solid rgba(0, 242, 254, 0.4);
          border-radius: 20px;
          padding: 4px 11px;
          cursor: pointer;
          width: fit-content;
        }
        .badge ha-icon {
          --mdc-icon-size: 15px;
          margin-right: 9px;
        }
        .badge span {
          font-size: 14px;
          color: #00f2fe;
          font-weight: 800;
        }
        .body-container {
          display: grid;
          gap: 14px;
          align-items: center;
        }
        .body-container.layout-left { grid-template-columns: 1fr 1fr; }
        .body-container.layout-right { grid-template-columns: 1fr 1fr; }
        .body-container.layout-right .icon-main { order: 2; }
        .body-container.layout-right .telemetry { order: 1; }
        .body-container.layout-center { grid-template-columns: 1fr; }
        .body-container.full-width { grid-template-columns: 1fr; }
        .body-container.single-no-icon { grid-template-columns: 1fr; margin-top: -4px; margin-bottom: -4px; }
        .body-container.hidden-all { display: none; }
        .icon-main {
          background: linear-gradient(135deg, rgba(0,242,254,0.12) 0%, rgba(0,242,254,0.02) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          min-height: 130px;
          height: 130px;
          box-sizing: border-box;
        }
        .body-container.layout-center .icon-main { min-height: 80px; height: 80px; }
        .icon-main ha-icon {
          --mdc-icon-size: ${mainLayout === "center" ? "40px" : "58px"};
          color: #00f2fe;
          filter: drop-shadow(0px 0px 10px rgba(0,242,254,0.8));
        }
        .telemetry {
          display: flex;
          flex-direction: column;
          justify-content: ${effectiveCount === 1 ? "center" : "space-between"};
          gap: 10px;
          height: 130px;
        }
        .body-container.layout-center .telemetry {
          display: ${firstLayout === "grid" ? "grid" : "flex"};
          ${firstLayout === "grid" ? "grid-template-columns: 1fr 1fr;" : "flex-direction: column;"}
          gap: 14px;
          height: auto;
          width: 100%;
        }
        .body-container.single-no-icon .telemetry {
          height: auto;
        }
        .telemetry.grid-side {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          height: auto;
          width: 100%;
        }
        .tele-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 12px 15px;
          cursor: pointer;
          box-sizing: border-box;
          height: 60px;
        }
        .tele-box ha-icon {
          --mdc-icon-size: 30px;
        }
        .tele-box .value {
          font-size: 20px;
          font-weight: 900;
          text-align: right;
        }
        .extra-containers {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          width: 100%;
        }
        .extra-containers.single-item {
          grid-template-columns: 1fr;
        }

        .alerts-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
          ${hasAnyContentAboveAlerts ? 'border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px;' : ''}
        }
        .alert-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 8px 15px;
          box-sizing: border-box;
          height: 60px;
          width: 100%;
          cursor: pointer;
          transition: background 0.2s;
          overflow: hidden;
        }
        .alert-box:hover {
          background: rgba(0, 242, 254, 0.05);
        }
        .alert-box ha-icon {
          --mdc-icon-size: 28px;
          flex-shrink: 0;
        }
        .alert-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 1px;
          overflow: hidden;
          flex: 1;
          margin-left: 10px;
        }
        .alert-title {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .alert-advice {
          font-size: 11px;
          font-weight: 500;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .alert-box .value {
          font-size: 15px;
          font-weight: 900;
          text-align: right;
          flex-shrink: 0;
          margin-left: 10px;
        }

        .bars-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
          ${hasAnyContentAboveBars ? 'border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px;' : ''}
        }
        .bar-item {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 3px;
          box-sizing: border-box;
          background: transparent;
          border: none;
          padding: 2px 0;
          transition: opacity 0.2s;
        }
        .bar-item:hover {
          opacity: 0.85;
        }
        .bar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1px;
        }
        .bar-info {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .bar-info ha-icon {
          --mdc-icon-size: 17px;
        }
        .bar-name {
          font-size: 13.5px;
          font-weight: 700;
        }
        .bar-value {
          font-size: 13.5px;
          font-weight: 800;
        }
        .bottom-bar-track {
          background: rgba(255, 255, 255, 0.1);
          height: 7px;
          border-radius: 3.5px;
          overflow: hidden;
          width: 100%;
          position: relative;
        }
        .bottom-bar-fill {
          height: 100%;
          border-radius: 3.5px;
          transition: width 0.3s ease;
        }
        .bottom-bar-labels {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: #9ca3af;
          font-weight: 600;
          margin-top: 1px;
        }

        .buttons-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
          ${hasAnyContentAboveButtons ? 'border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px;' : ''}
        }
        .buttons-row-grid {
          display: grid;
          gap: 10px;
          width: 100%;
        }
        .btn-item {
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          padding: 12px 10px;
          min-height: 70px;
          box-shadow: inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 10px rgba(0,0,0,0.4);
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-item:hover {
          background: rgba(0, 242, 254, 0.08);
          border-color: rgba(0, 242, 254, 0.4);
          transform: translateY(-2px);
        }
        .btn-item.active {
          border-width: 2px;
          box-shadow: 0 0 15px rgba(0, 242, 254, 0.4), inset 0 1px 1px rgba(255,255,255,0.2);
        }
        .btn-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }
        .btn-content ha-icon {
          --mdc-icon-size: 22px;
        }
        .btn-name {
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100%;
        }
        .btn-state {
          font-size: 11px;
          font-weight: 600;
          text-align: center;
        }
      </style>
      
      <ha-card>
        <div class="header align-${alignment}">
          <div class="title">${cfg.title || ""}</div>
          ${
            cfg.presence
              ? `<div class="badge" id="badge">
                  <ha-icon icon="mdi:circle" style="color:${
                    presenceOn ? "#22c55e" : "#64748b"
                  };"></ha-icon>
                  <span>Présence détectée</span>
                </div>`
              : ""
          }
        </div>
        <div class="${containerClass}">
          ${
            !hideMain
              ? `<div class="icon-main" id="icon-main">
                  <ha-icon icon="${cfg.main_icon || "mdi:help-circle"}"></ha-icon>
                </div>`
              : ""
          }
          ${
            hasTelemetry
              ? `<div class="telemetry ${hideMain && effectiveCount >= 2 && firstLayout === "grid" ? "grid-side" : ""}">
                  ${
                    activeTop
                      ? `<div class="tele-box box-${activeTop.index}" id="box-${activeTop.index}" style="border-left: 4px solid ${activeTop.color};">
                          <ha-icon icon="${this._resolveIcon(activeTop.icon, activeTop.state)}" style="color: ${activeTop.iconColor};"></ha-icon>
                          <span class="value" style="color: ${activeTop.textColor};">${this._formatState(activeTop.state)}</span>
                        </div>`
                      : ""
                  }
                  ${
                    activeBottom && effectiveCount >= 2
                      ? `<div class="tele-box box-${activeBottom.index}" id="box-${activeBottom.index}" style="border-left: 4px solid ${activeBottom.color};">
                          <ha-icon icon="${this._resolveIcon(activeBottom.icon, activeBottom.state)}" style="color: ${activeBottom.iconColor};"></ha-icon>
                          <span class="value" style="color: ${activeBottom.textColor};">${this._formatState(activeBottom.state)}</span>
                        </div>`
                      : ""
                  }
                </div>`
              : ""
          }
        </div>
        ${extraHtml}
        ${
          showBottomBars && bars.length > 0
            ? `<div class="bars-wrapper">
                ${bars
                  .map((bar, index) => {
                    const stateObj = hass && bar.entity ? hass.states[bar.entity] : undefined;
                    let unit = stateObj && stateObj.attributes ? (stateObj.attributes.unit_of_measurement || "") : "";
                    
                    const limits = this._getSmartDefaults(stateObj, bar);
                    let minVal = limits.min;
                    let maxVal = limits.max;
                    
                    let currentValFormatted = "N/A";
                    let barPercent = 0;

                    if (stateObj) {
                      const val = parseFloat(stateObj.state);
                      if (!isNaN(val)) {
                        currentValFormatted = `${val.toFixed(1)} ${unit}`.trim();
                        barPercent = Math.max(0, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
                      }
                    }

                    const startColor = bar.color || "#00f2fe";
                    const endColor = bar.color_end || "";
                    const fillBackground = endColor ? `linear-gradient(90deg, ${startColor}, ${endColor})` : startColor;
                    
                    const barName = this._resolveName(bar.name, stateObj, bar.entity, "Barre");
                    const barIcon = this._resolveIcon(bar.icon, stateObj);
                    
                    const barTextColor = bar.text_color || startColor;
                    const barIconColor = bar.icon_color || startColor;

                    return `
                      <div class="bar-item" id="bar-${index}">
                        <div class="bar-header">
                          <div class="bar-info">
                            <ha-icon icon="${barIcon}" style="color: ${barIconColor};"></ha-icon>
                            <span class="bar-name" style="color: ${barTextColor};">${barName}</span>
                          </div>
                          <span class="bar-value" style="color: ${barTextColor};">${currentValFormatted}</span>
                        </div>
                        <div class="bottom-bar-track">
                          <div class="bottom-bar-fill" style="width: ${barPercent}%; background: ${fillBackground};"></div>
                        </div>
                        <div class="bottom-bar-labels">
                          <span>${minVal} ${unit}</span>
                          <span>${maxVal} ${unit}</span>
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>`
            : ""
        }
        ${
          showButtons && buttons.length > 0
            ? `<div class="buttons-wrapper">
                ${buttonsHtml}
              </div>`
            : ""
        }
        ${
          (showAirQuality || showSecurityAlert)
            ? `<div class="alerts-group">
                ${
                  showAirQuality
                    ? `<div class="alert-box" id="air-box" style="border-left: 4px solid ${airColor};">
                        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
                          <ha-icon icon="${airIcon}" style="color: ${airColor};"></ha-icon>
                          <div class="alert-info">
                            <span class="alert-title">${airTitle}</span>
                            <span class="alert-advice">${airAdviceText}</span>
                          </div>
                        </div>
                        <span class="value" style="color: ${airColor};">${airStatusText}</span>
                      </div>`
                    : ""
                }
                ${
                  showSecurityAlert
                    ? `<div class="alert-box" id="sec-box" style="border-left: 4px solid ${secColor};">
                        <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
                          <ha-icon icon="${secIcon}" style="color: ${secColor};"></ha-icon>
                          <div class="alert-info">
                            <span class="alert-title">${secTitle}</span>
                            <span class="alert-advice">${secAdviceText}</span>
                          </div>
                        </div>
                        <span class="value" style="color: ${secColor};">${secStatusText}</span>
                      </div>`
                    : ""
                }
              </div>`
            : ""
        }
      </ha-card>
    `;

    // Événements d'interaction
    const badge = this.shadowRoot.getElementById("badge");
    if (badge) badge.addEventListener("click", () => this._moreInfo(cfg.presence));
    
    const iconMain = this.shadowRoot.getElementById("icon-main");
    if (iconMain) {
      const actionConfig = cfg.icon_tap_action || (cfg.navigation_path ? { action: "navigate", navigation_path: cfg.navigation_path } : undefined);
      iconMain.addEventListener("click", () => this._handleAction(actionConfig));
    }

    const airBox = this.shadowRoot.getElementById("air-box");
    if (airBox) {
      airBox.addEventListener("click", () => {
        if (cfg.air_humidity_entity) this._moreInfo(cfg.air_humidity_entity);
        else if (cfg.air_temp_entity) this._moreInfo(cfg.air_temp_entity);
      });
    }

    const secBox = this.shadowRoot.getElementById("sec-box");
    if (secBox && cfg.security_entity) secBox.addEventListener("click", () => this._moreInfo(cfg.security_entity));

    rawSlots.forEach(item => {
      const box = this.shadowRoot.getElementById(`box-${item.index}`);
      if (box) box.addEventListener("click", () => this._handleAction(item.action, item.entity));
    });

    bars.forEach((bar, index) => {
      const el = this.shadowRoot.getElementById(`bar-${index}`);
      if (el && bar.entity && hass) el.addEventListener("click", () => this._moreInfo(bar.entity));
    });

    buttons.forEach((btn, index) => {
      const el = this.shadowRoot.getElementById(`embedded-btn-${index}`);
      if (el) {
        const actionConfig = btn.action || { action: "more-info" };
        el.addEventListener("click", () => this._handleAction(actionConfig, btn.entity));
      }
    });
  }
}

class FieldITechMultifunctionCardEditor extends HTMLElement {
  constructor() {
    super();
    this._collapsedSections = {
      design: false,
      telemetry: false,
      bars: false,
      buttons: false,
      alerts: false
    };
  }

  setConfig(config) {
    let entities = [];
    if (Array.isArray(config.entities)) {
      entities = config.entities;
    } else {
      if (config.top_entity) entities.push({ entity: config.top_entity, icon: config.top_icon || "", color: config.top_color || "#ff9f0a", action: config.top_tap_action || { action: "more-info" } });
      if (config.bottom_entity) entities.push({ entity: config.bottom_entity, icon: config.bottom_entity_icon || config.bottom_icon || "", color: config.bottom_color || "#00f2fe", action: config.bottom_tap_action || { action: "more-info" } });
      if (config.third_entity) entities.push({ entity: config.third_entity, icon: config.third_icon || "", color: config.third_color || "#22c55e", action: config.third_tap_action || { action: "more-info" } });
      if (config.fourth_entity) entities.push({ entity: config.fourth_entity, icon: config.fourth_icon || "", color: config.fourth_color || "#a855f7", action: config.fourth_tap_action || { action: "more-info" } });
    }

    this._config = {
      entities: [],
      bars: [],
      buttons: [],
      ...config,
      entities: entities
    };

    if (this._built) {
      this._syncValues();
      this._updateVisibility();
    } else {
      this._tryRender();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._built) {
      this._syncHass();
      this._autoDetectAlertEntities();
    } else {
      this._tryRender();
    }
  }

  connectedCallback() {
    this._tryRender();
  }

  _getCandidatesEntities() {
    if (!this._config) return [];
    const candidates = [];
    if (Array.isArray(this._config.entities)) {
      this._config.entities.forEach(item => {
        if (item && item.entity) candidates.push(item.entity);
      });
    }
    if (Array.isArray(this._config.bars)) {
      this._config.bars.forEach(bar => {
        if (bar && bar.entity) candidates.push(bar.entity);
      });
    }
    return candidates;
  }

  _autoDetectAlertEntities() {
    if (!this._hass || !this._config) return;
    const states = this._hass.states;
    let updated = false;
    let newConfig = { ...this._config };

    const candidates = this._getCandidatesEntities();

    const findEntity = (predicate) => {
      for (const id of candidates) {
        const s = states[id];
        if (s && predicate(id, s)) return id;
      }
      return "";
    };

    if (newConfig.show_air_quality) {
      if (!newConfig.air_temp_entity) {
        const tempId = findEntity((id, s) => s.attributes && (s.attributes.device_class === "temperature" || id.includes("temperature") || id.includes("temp")));
        if (tempId) {
          newConfig.air_temp_entity = tempId;
          updated = true;
        }
      }
      if (!newConfig.air_humidity_entity) {
        const humId = findEntity((id, s) => s.attributes && (s.attributes.device_class === "humidity" || id.includes("humidity") || id.includes("humidite") || id.includes("hum")));
        if (humId) {
          newConfig.air_humidity_entity = humId;
          updated = true;
        }
      }
    }

    if (newConfig.show_security_alert) {
      if (!newConfig.security_entity) {
        const secId = findEntity((id, s) => {
          const dc = s.attributes && s.attributes.device_class;
          const domain = id.split(".")[0];
          return domain === "alarm_control_panel" || (domain === "binary_sensor" && ["door", "window", "motion", "occupancy", "smoke", "moisture", "safety", "problem", "opening"].includes(dc));
        });
        if (secId) {
          newConfig.security_entity = secId;
          updated = true;
        }
      }
    }

    if (updated) {
      this._config = newConfig;
      this._syncValues();
      const event = new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }
  }

  _tryRender() {
    if (this._built || !this._hass || !this._config) return;
    this._built = true;
    this._buildForm();
    this._syncHass();
    this._autoDetectAlertEntities();
    this._syncValues();
    this._updateVisibility();
  }

  _row(labelText, el) {
    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(el);
    return row;
  }

  // Construit une grille de sélecteurs couleur et délègue les changements à un seul écouteur.
  _buildColorGrid(defs, onChange) {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = defs.map(() => "1fr").join(" ");
    row.style.gap = "8px";
    row.innerHTML = defs
      .map(d => `<div class="field"><label>${d.label}</label><input type="color" data-key="${d.key}" value="${d.value}"></div>`)
      .join("");
    row.addEventListener("input", (e) => {
      const key = e.target && e.target.dataset ? e.target.dataset.key : undefined;
      if (key) onChange(key, e.target.value);
    });
    return row;
  }

  _buildForm() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 4px 0;
      }
      .row { width: 100%; }
      ha-icon-picker, ha-entity-picker, ha-selector, ha-select {
        width: 100%;
        display: block;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        width: 100%;
      }
      .field label {
        font-size: 12px;
        color: var(--secondary-text-color, #9ca3af);
      }
      .field input, .field select {
        background: var(--card-background-color, rgba(0, 0, 0, 0.3));
        border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
        border-radius: 6px;
        padding: 12px;
        color: var(--primary-text-color, #ffffff);
        font-size: 14px;
        font-family: inherit;
        width: 100%;
        box-sizing: border-box;
      }
      .field select { cursor: pointer; }
      .field input[type="color"] {
        height: 40px;
        padding: 4px;
        cursor: pointer;
      }
      .field input:focus, .field select:focus {
        outline: none;
        border-color: var(--primary-color, #03a9f4);
      }
      .checkbox-row {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        color: var(--primary-text-color, #ffffff);
        font-size: 14px;
      }
      .section-header {
        font-weight: 700;
        font-size: 14px;
        color: var(--primary-color, #03a9f4);
        margin-top: 8px;
        border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
        padding-top: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .collapse-btn {
        background: none;
        border: none;
        color: var(--primary-color, #03a9f4);
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 2px 6px;
      }
      .slot-group {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .slot-group.hidden, .conditional-row.hidden, .section-collapsible.collapsed {
        display: none !important;
      }
      .entity-editor-box, .bar-editor-box, .btn-editor-box {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .row-layout-box {
        background: rgba(0, 242, 254, 0.05);
        border: 1px dashed rgba(0, 242, 254, 0.3);
        border-radius: 10px;
        padding: 10px;
        margin-top: 4px;
        margin-bottom: 4px;
      }
      .btn {
        background: rgba(0, 242, 254, 0.2);
        border: 1px solid rgba(0, 242, 254, 0.5);
        color: #00f2fe;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 700;
        font-size: 12px;
      }
      .btn-danger {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: #ef4444;
      }
    `;
    this.shadowRoot.appendChild(style);

    const wrapper = document.createElement("div");
    wrapper.className = "card-config";

    // --- SECTION DESIGN GÉNÉRAL DE LA CARTE ---
    const designSectionHeader = document.createElement("div");
    designSectionHeader.className = "section-header";
    designSectionHeader.innerHTML = `
      <span>Design Général de la Carte</span>
      <button class="collapse-btn" id="collapse-design-btn" type="button">▼ Masquer</button>
    `;
    wrapper.appendChild(designSectionHeader);

    this._designCollapsibleWrapper = document.createElement("div");
    this._designCollapsibleWrapper.className = "slot-group section-collapsible";

    const titleGroup = document.createElement("div");
    titleGroup.style.display = "grid";
    titleGroup.style.gridTemplateColumns = "3fr 1fr";
    titleGroup.style.gap = "10px";
    
    const titleField = document.createElement("div");
    titleField.className = "field";
    titleField.innerHTML = `<label>Titre de la carte</label>`;
    this._titleInput = document.createElement("input");
    this._titleInput.type = "text";
    this._titleInput.addEventListener("input", () => this._valueChanged("title", this._titleInput.value));
    titleField.appendChild(this._titleInput);

    const titleColorField = document.createElement("div");
    titleColorField.className = "field";
    titleColorField.innerHTML = `<label>Couleur du titre</label>`;
    this._titleColorInput = document.createElement("input");
    this._titleColorInput.type = "color";
    this._titleColorInput.addEventListener("input", () => this._valueChanged("title_color", this._titleColorInput.value));
    titleColorField.appendChild(this._titleColorInput);

    titleGroup.appendChild(titleField);
    titleGroup.appendChild(titleColorField);
    this._designCollapsibleWrapper.appendChild(titleGroup);

    const alignField = document.createElement("div");
    alignField.className = "field";
    const alignLabel = document.createElement("label");
    alignLabel.textContent = "Alignement du titre et du badge";
    this._alignSelect = document.createElement("select");
    [
      { value: "left", label: "Gauche (Titre à gauche, badge à droite)" },
      { value: "right", label: "Droite (Titre à droite, badge à gauche)" },
      { value: "center", label: "Centré (Titre centré, badge en dessous)" }
    ].forEach(opt => {
      const elOpt = document.createElement("option");
      elOpt.value = opt.value;
      elOpt.textContent = opt.label;
      this._alignSelect.appendChild(elOpt);
    });
    this._alignSelect.addEventListener("change", () => this._valueChanged("title_alignment", this._alignSelect.value));
    alignField.appendChild(alignLabel);
    alignField.appendChild(this._alignSelect);
    this._designCollapsibleWrapper.appendChild(alignField);

    const designOptionsRow = document.createElement("div");
    designOptionsRow.style.display = "grid";
    designOptionsRow.style.gridTemplateColumns = "2fr 1fr";
    designOptionsRow.style.gap = "10px";

    const cardBgField = document.createElement("div");
    cardBgField.className = "field";
    cardBgField.innerHTML = `<label>Design fond (Gradient / CSS / Couleur)</label>`;
    this._cardBgInput = document.createElement("input");
    this._cardBgInput.type = "text";
    this._cardBgInput.addEventListener("input", () => this._valueChanged("card_background", this._cardBgInput.value));
    cardBgField.appendChild(this._cardBgInput);
    designOptionsRow.appendChild(cardBgField);

    const cardBgColorField = document.createElement("div");
    cardBgColorField.className = "field";
    cardBgColorField.innerHTML = `<label>Couleur de fond générale</label>`;
    this._cardBgColorInput = document.createElement("input");
    this._cardBgColorInput.type = "color";
    this._cardBgColorInput.addEventListener("input", () => {
      this._valueChanged("card_background", this._cardBgColorInput.value);
      if (this._cardBgInput) this._cardBgInput.value = this._cardBgColorInput.value;
    });
    cardBgColorField.appendChild(this._cardBgColorInput);
    designOptionsRow.appendChild(cardBgColorField);

    this._designCollapsibleWrapper.appendChild(designOptionsRow);

    const cardBorderRow = document.createElement("div");
    cardBorderRow.style.display = "grid";
    cardBorderRow.style.gridTemplateColumns = "1fr";
    cardBorderRow.style.gap = "10px";

    const cardBorderField = document.createElement("div");
    cardBorderField.className = "field";
    cardBorderField.innerHTML = `<label>Couleur contour</label>`;
    this._cardBorderInput = document.createElement("input");
    this._cardBorderInput.type = "color";
    this._cardBorderInput.addEventListener("input", () => this._valueChanged("card_border_color", this._cardBorderInput.value));
    cardBorderField.appendChild(this._cardBorderInput);
    cardBorderRow.appendChild(cardBorderField);
    this._designCollapsibleWrapper.appendChild(cardBorderRow);

    const neonRow = document.createElement("div");
    neonRow.className = "row";
    const neonLabel = document.createElement("label");
    neonLabel.className = "checkbox-row";
    this._cardNeonCheckbox = document.createElement("input");
    this._cardNeonCheckbox.type = "checkbox";
    this._cardNeonCheckbox.addEventListener("change", () => this._valueChanged("card_neon_effect", this._cardNeonCheckbox.checked));
    neonLabel.appendChild(this._cardNeonCheckbox);
    neonLabel.appendChild(document.createTextNode("Activer l'effet néon (halo lumineux autour de la carte)"));
    neonRow.appendChild(neonLabel);
    this._designCollapsibleWrapper.appendChild(neonRow);

    wrapper.appendChild(this._designCollapsibleWrapper);

    designSectionHeader.querySelector("#collapse-design-btn").addEventListener("click", () => {
      this._collapsedSections.design = !this._collapsedSections.design;
      this._updateCollapseStates();
    });

    this._mainIconGroup = document.createElement("div");
    this._mainIconGroup.className = "slot-group";

    this._iconPicker = document.createElement("ha-icon-picker");
    this._iconPicker.label = "Icône principale";
    this._iconPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("main_icon", ev.detail.value);
    });
    this._mainIconGroup.appendChild(this._row(null, this._iconPicker));

    const layoutField = document.createElement("div");
    layoutField.className = "field";
    const layoutLabel = document.createElement("label");
    layoutLabel.textContent = "Disposition de l'icône principale";
    this._layoutSelect = document.createElement("select");
    [
      { value: "left", label: "Gauche" },
      { value: "right", label: "Droite" },
      { value: "center", label: "Centré" }
    ].forEach(opt => {
      const elOpt = document.createElement("option");
      elOpt.value = opt.value;
      elOpt.textContent = opt.label;
      this._layoutSelect.appendChild(elOpt);
    });
    this._layoutSelect.addEventListener("change", () => {
      this._valueChanged("main_layout", this._layoutSelect.value);
      this._updateVisibility();
    });
    layoutField.appendChild(layoutLabel);
    layoutField.appendChild(this._layoutSelect);
    this._mainIconGroup.appendChild(layoutField);

    const navRow = document.createElement("div");
    navRow.className = "field";
    const navLabel = document.createElement("label");
    navLabel.textContent = "Action au clic sur l'icône principale";
    this._actionSelector = document.createElement("ha-selector");
    this._actionSelector.selector = { ui_action: {} };
    this._actionSelector.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("icon_tap_action", ev.detail.value);
    });
    navRow.appendChild(navLabel);
    navRow.appendChild(this._actionSelector);
    this._mainIconGroup.appendChild(navRow);

    wrapper.appendChild(this._mainIconGroup);

    const hideMainIconRow = document.createElement("div");
    hideMainIconRow.className = "row";
    const hideMainIconLabel = document.createElement("label");
    hideMainIconLabel.className = "checkbox-row";
    this._hideMainIconCheckbox = document.createElement("input");
    this._hideMainIconCheckbox.type = "checkbox";
    this._hideMainIconCheckbox.addEventListener("change", () => {
      this._valueChanged("hide_main_icon", this._hideMainIconCheckbox.checked);
      this._updateVisibility();
    });
    hideMainIconLabel.appendChild(this._hideMainIconCheckbox);
    hideMainIconLabel.appendChild(document.createTextNode("Masquer le bloc de l'icône principale"));
    hideMainIconRow.appendChild(hideMainIconLabel);
    wrapper.appendChild(hideMainIconRow);

    const hideTelemetryRow = document.createElement("div");
    hideTelemetryRow.className = "row";
    const hideTelemetryLabel = document.createElement("label");
    hideTelemetryLabel.className = "checkbox-row";
    this._hideTelemetryCheckbox = document.createElement("input");
    this._hideTelemetryCheckbox.type = "checkbox";
    this._hideTelemetryCheckbox.addEventListener("change", () => {
      this._valueChanged("hide_telemetry", this._hideTelemetryCheckbox.checked);
      this._updateVisibility();
    });
    hideTelemetryLabel.appendChild(this._hideTelemetryCheckbox);
    hideTelemetryLabel.appendChild(document.createTextNode("Masquer les cartes de télémétrie"));
    hideTelemetryRow.appendChild(hideTelemetryLabel);
    wrapper.appendChild(hideTelemetryRow);

    this._firstLayoutField = document.createElement("div");
    this._firstLayoutField.className = "field conditional-row";
    const firstLayoutLabel = document.createElement("label");
    firstLayoutLabel.textContent = "Affichage des 2 premières entités";
    this._firstLayoutSelect = document.createElement("select");
    [
      { value: "grid", label: "Côte à côte (2 par ligne)" },
      { value: "full", label: "L'une au-dessus de l'autre" }
    ].forEach(opt => {
      const elOpt = document.createElement("option");
      elOpt.value = opt.value;
      elOpt.textContent = opt.label;
      this._firstLayoutSelect.appendChild(elOpt);
    });
    this._firstLayoutSelect.addEventListener("change", () => this._valueChanged("first_layout", this._firstLayoutSelect.value));
    this._firstLayoutField.appendChild(firstLayoutLabel);
    this._firstLayoutField.appendChild(this._firstLayoutSelect);
    wrapper.appendChild(this._firstLayoutField);

    this._dynamicLayoutsContainer = document.createElement("div");
    this._dynamicLayoutsContainer.style.display = "flex";
    this._dynamicLayoutsContainer.style.flexDirection = "column";
    this._dynamicLayoutsContainer.style.gap = "12px";
    wrapper.appendChild(this._dynamicLayoutsContainer);

    this._presencePicker = document.createElement("ha-entity-picker");
    this._presencePicker.label = "Capteur de présence";
    this._presencePicker.includeDomains = ["binary_sensor"];
    this._presencePicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("presence", ev.detail.value);
    });
    wrapper.appendChild(this._row(null, this._presencePicker));

    // --- SECTION TÉLÉMÉTRIE ---
    const entitiesSectionHeader = document.createElement("div");
    entitiesSectionHeader.className = "section-header";
    entitiesSectionHeader.innerHTML = `
      <span>Entités / Télémesures</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="btn" id="add-entity-btn" type="button">+ Ajouter</button>
        <button class="collapse-btn" id="collapse-telemetry-btn" type="button">▼ Masquer</button>
      </div>
    `;
    wrapper.appendChild(entitiesSectionHeader);

    this._telemetryCollapsibleContent = document.createElement("div");
    this._telemetryCollapsibleContent.className = "slot-group section-collapsible";
    this._entitiesContainer = document.createElement("div");
    this._entitiesContainer.style.display = "flex";
    this._entitiesContainer.style.flexDirection = "column";
    this._entitiesContainer.style.gap = "12px";
    this._telemetryCollapsibleContent.appendChild(this._entitiesContainer);
    wrapper.appendChild(this._telemetryCollapsibleContent);

    entitiesSectionHeader.querySelector("#add-entity-btn").addEventListener("click", () => {
      const entities = [...(this._config.entities || [])];
      entities.push({ entity: "", icon: "", color: "#00f2fe", text_color: "", icon_color: "", action: { action: "more-info" } });
      this._valueChanged("entities", entities);
      this._syncValues();
    });

    entitiesSectionHeader.querySelector("#collapse-telemetry-btn").addEventListener("click", () => {
      this._collapsedSections.telemetry = !this._collapsedSections.telemetry;
      this._updateCollapseStates();
    });

    // --- SECTION BARRES GRADUÉES ---
    const barsSectionHeader = document.createElement("div");
    barsSectionHeader.className = "section-header";
    barsSectionHeader.innerHTML = `
      <span>Barres graduées en bas (Multiples)</span>
      <button class="collapse-btn" id="collapse-bars-btn" type="button">▼ Masquer</button>
    `;
    wrapper.appendChild(barsSectionHeader);

    this._barsCollapsibleWrapper = document.createElement("div");
    this._barsCollapsibleWrapper.className = "slot-group section-collapsible";

    const showBottomBarsRow = document.createElement("div");
    showBottomBarsRow.className = "row";
    const showBottomBarsLabel = document.createElement("label");
    showBottomBarsLabel.className = "checkbox-row";
    this._showBottomBarsCheckbox = document.createElement("input");
    this._showBottomBarsCheckbox.type = "checkbox";
    this._showBottomBarsCheckbox.addEventListener("change", () => {
      this._valueChanged("show_bottom_bars", this._showBottomBarsCheckbox.checked);
      this._updateVisibility();
    });
    showBottomBarsLabel.appendChild(this._showBottomBarsCheckbox);
    showBottomBarsLabel.appendChild(document.createTextNode("Afficher les barres graduées"));
    showBottomBarsRow.appendChild(showBottomBarsLabel);
    this._barsCollapsibleWrapper.appendChild(showBottomBarsRow);

    this._bottomBarsDetails = document.createElement("div");
    this._bottomBarsDetails.className = "slot-group";

    const addBarHeaderBtnRow = document.createElement("div");
    addBarHeaderBtnRow.style.display = "flex";
    addBarHeaderBtnRow.style.justifyContent = "space-between";
    addBarHeaderBtnRow.style.alignItems = "center";
    addBarHeaderBtnRow.innerHTML = `
      <span style="font-size: 13px; color: var(--secondary-text-color, #9ca3af);">Liste des barres</span>
      <button class="btn" id="add-bar-btn" type="button">+ Ajouter une barre</button>
    `;
    this._bottomBarsDetails.appendChild(addBarHeaderBtnRow);

    this._barsContainer = document.createElement("div");
    this._barsContainer.style.display = "flex";
    this._barsContainer.style.flexDirection = "column";
    this._barsContainer.style.gap = "12px";
    this._bottomBarsDetails.appendChild(this._barsContainer);

    addBarHeaderBtnRow.querySelector("#add-bar-btn").addEventListener("click", () => {
      const bars = [...(this._config.bars || [])];
      bars.push({ entity: "", name: "", icon: "", color: "#00f2fe", color_end: "", text_color: "", icon_color: "" });
      this._valueChanged("bars", bars);
      this._syncValues();
    });

    this._barsCollapsibleWrapper.appendChild(this._bottomBarsDetails);
    wrapper.appendChild(this._barsCollapsibleWrapper);

    barsSectionHeader.querySelector("#collapse-bars-btn").addEventListener("click", () => {
      this._collapsedSections.bars = !this._collapsedSections.bars;
      this._updateCollapseStates();
    });

    // --- SECTION BOUTONS DE COMMANDES ---
    const buttonsSectionHeader = document.createElement("div");
    buttonsSectionHeader.className = "section-header";
    buttonsSectionHeader.innerHTML = `
      <span>Boutons de commandes intégrés</span>
      <button class="collapse-btn" id="collapse-buttons-btn" type="button">▼ Masquer</button>
    `;
    wrapper.appendChild(buttonsSectionHeader);

    this._buttonsCollapsibleWrapper = document.createElement("div");
    this._buttonsCollapsibleWrapper.className = "slot-group section-collapsible";

    const showButtonsRow = document.createElement("div");
    showButtonsRow.className = "row";
    const showButtonsLabel = document.createElement("label");
    showButtonsLabel.className = "checkbox-row";
    this._showButtonsCheckbox = document.createElement("input");
    this._showButtonsCheckbox.type = "checkbox";
    this._showButtonsCheckbox.addEventListener("change", () => {
      this._valueChanged("show_buttons", this._showButtonsCheckbox.checked);
      this._updateVisibility();
    });
    showButtonsLabel.appendChild(this._showButtonsCheckbox);
    showButtonsLabel.appendChild(document.createTextNode("Afficher les boutons de commandes"));
    showButtonsRow.appendChild(showButtonsLabel);
    this._buttonsCollapsibleWrapper.appendChild(showButtonsRow);

    this._bottomButtonsDetails = document.createElement("div");
    this._bottomButtonsDetails.className = "slot-group";

    const addBtnHeaderBtnRow = document.createElement("div");
    addBtnHeaderBtnRow.style.display = "flex";
    addBtnHeaderBtnRow.style.justifyContent = "space-between";
    addBtnHeaderBtnRow.style.alignItems = "center";
    addBtnHeaderBtnRow.innerHTML = `
      <span style="font-size: 13px; color: var(--secondary-text-color, #9ca3af);">Liste des boutons</span>
      <button class="btn" id="add-btn-btn" type="button">+ Ajouter un bouton</button>
    `;
    this._bottomButtonsDetails.appendChild(addBtnHeaderBtnRow);

    this._buttonsContainer = document.createElement("div");
    this._buttonsContainer.style.display = "flex";
    this._buttonsContainer.style.flexDirection = "column";
    this._buttonsContainer.style.gap = "12px";
    this._bottomButtonsDetails.appendChild(this._buttonsContainer);

    addBtnHeaderBtnRow.querySelector("#add-btn-btn").addEventListener("click", () => {
      const buttons = [...(this._config.buttons || [])];
      buttons.push({ entity: "", name: "", icon: "", color: "#00f2fe", text_color: "", icon_color: "", state_color: "", background: "", border_color: "", action: { action: "more-info" } });
      this._valueChanged("buttons", buttons);
      this._syncValues();
    });

    this._buttonsCollapsibleWrapper.appendChild(this._bottomButtonsDetails);
    wrapper.appendChild(this._buttonsCollapsibleWrapper);

    buttonsSectionHeader.querySelector("#collapse-buttons-btn").addEventListener("click", () => {
      this._collapsedSections.buttons = !this._collapsedSections.buttons;
      this._updateCollapseStates();
    });

    // --- SECTIONS DES CARTES D'ALERTE ---
    const alertsSectionHeader = document.createElement("div");
    alertsSectionHeader.className = "section-header";
    alertsSectionHeader.innerHTML = `
      <span>Cartes d'Alerte (Personnalisation & Options)</span>
      <button class="collapse-btn" id="collapse-alerts-btn" type="button">▼ Masquer</button>
    `;
    wrapper.appendChild(alertsSectionHeader);

    this._alertsCollapsibleWrapper = document.createElement("div");
    this._alertsCollapsibleWrapper.className = "slot-group section-collapsible";

    const airQualitySubHeader = document.createElement("div");
    airQualitySubHeader.style.fontWeight = "600";
    airQualitySubHeader.style.fontSize = "13px";
    airQualitySubHeader.style.color = "var(--secondary-text-color, #9ca3af)";
    airQualitySubHeader.style.marginTop = "4px";
    airQualitySubHeader.textContent = "Qualité de l'Air";
    this._alertsCollapsibleWrapper.appendChild(airQualitySubHeader);

    const showAirQualityRow = document.createElement("div");
    showAirQualityRow.className = "row";
    const showAirQualityLabel = document.createElement("label");
    showAirQualityLabel.className = "checkbox-row";
    this._showAirQualityCheckbox = document.createElement("input");
    this._showAirQualityCheckbox.type = "checkbox";
    this._showAirQualityCheckbox.addEventListener("change", () => {
      this._valueChanged("show_air_quality", this._showAirQualityCheckbox.checked);
      this._updateVisibility();
      if (this._showAirQualityCheckbox.checked) {
        this._autoDetectAlertEntities();
      }
    });
    showAirQualityLabel.appendChild(this._showAirQualityCheckbox);
    showAirQualityLabel.appendChild(document.createTextNode("Afficher la carte alerte qualité de l'air"));
    showAirQualityRow.appendChild(showAirQualityLabel);
    this._alertsCollapsibleWrapper.appendChild(showAirQualityRow);

    this._airQualityDetails = document.createElement("div");
    this._airQualityDetails.className = "slot-group";

    const airTitleField = document.createElement("div");
    airTitleField.className = "field";
    airTitleField.innerHTML = `<label>Titre de l'alerte</label>`;
    this._airTitleInput = document.createElement("input");
    this._airTitleInput.type = "text";
    this._airTitleInput.addEventListener("input", () => this._valueChanged("air_title", this._airTitleInput.value));
    airTitleField.appendChild(this._airTitleInput);
    this._airQualityDetails.appendChild(airTitleField);

    this._airIconPicker = document.createElement("ha-icon-picker");
    this._airIconPicker.label = "Icône personnalisée alerte Air";
    this._airIconPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("air_icon", ev.detail.value);
    });
    this._airQualityDetails.appendChild(this._row(null, this._airIconPicker));

    const airColorsRow = this._buildColorGrid([
      { label: "Couleur OK", key: "air_color", value: "#22c55e" },
      { label: "Couleur Moy.", key: "air_color_avg", value: "#f59e0b" },
      { label: "Couleur Mauv.", key: "air_color_bad", value: "#ef4444" },
    ], (key, value) => this._valueChanged(key, value));
    this._airQualityDetails.appendChild(airColorsRow);

    this._airTempPicker = document.createElement("ha-entity-picker");
    this._airTempPicker.label = "Capteur de Température (Intérieur)";
    this._airTempPicker.includeDomains = ["sensor"];
    this._airTempPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("air_temp_entity", ev.detail.value);
    });
    this._airQualityDetails.appendChild(this._row(null, this._airTempPicker));

    this._airHumPicker = document.createElement("ha-entity-picker");
    this._airHumPicker.label = "Capteur d'Humidité (Intérieur)";
    this._airHumPicker.includeDomains = ["sensor"];
    this._airHumPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("air_humidity_entity", ev.detail.value);
    });
    this._airQualityDetails.appendChild(this._row(null, this._airHumPicker));
    this._alertsCollapsibleWrapper.appendChild(this._airQualityDetails);

    const securitySubHeader = document.createElement("div");
    securitySubHeader.style.fontWeight = "600";
    securitySubHeader.style.fontSize = "13px";
    securitySubHeader.style.color = "var(--secondary-text-color, #9ca3af)";
    securitySubHeader.style.marginTop = "8px";
    securitySubHeader.textContent = "Sécurité & Ouvrants";
    this._alertsCollapsibleWrapper.appendChild(securitySubHeader);

    const showSecurityRow = document.createElement("div");
    showSecurityRow.className = "row";
    const showSecurityLabel = document.createElement("label");
    showSecurityLabel.className = "checkbox-row";
    this._showSecurityCheckbox = document.createElement("input");
    this._showSecurityCheckbox.type = "checkbox";
    this._showSecurityCheckbox.addEventListener("change", () => {
      this._valueChanged("show_security_alert", this._showSecurityCheckbox.checked);
      this._updateVisibility();
      if (this._showSecurityCheckbox.checked) {
        this._autoDetectAlertEntities();
      }
    });
    showSecurityLabel.appendChild(this._showSecurityCheckbox);
    showSecurityLabel.appendChild(document.createTextNode("Afficher la carte alerte sécurité"));
    showSecurityRow.appendChild(showSecurityLabel);
    this._alertsCollapsibleWrapper.appendChild(showSecurityRow);

    this._securityDetails = document.createElement("div");
    this._securityDetails.className = "slot-group";

    const secTitleField = document.createElement("div");
    secTitleField.className = "field";
    secTitleField.innerHTML = `<label>Titre de l'alerte</label>`;
    this._secTitleInput = document.createElement("input");
    this._secTitleInput.type = "text";
    this._secTitleInput.addEventListener("input", () => this._valueChanged("sec_title", this._secTitleInput.value));
    secTitleField.appendChild(this._secTitleInput);
    this._securityDetails.appendChild(secTitleField);

    this._secIconPicker = document.createElement("ha-icon-picker");
    this._secIconPicker.label = "Icône personnalisée alerte Sécurité";
    this._secIconPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("sec_icon", ev.detail.value);
    });
    this._securityDetails.appendChild(this._row(null, this._secIconPicker));

    const secColorsRow = this._buildColorGrid([
      { label: "Couleur Sécurisé (OK)", key: "sec_color", value: "#22c55e" },
      { label: "Couleur Alerte (Danger)", key: "sec_color_alert", value: "#ef4444" },
    ], (key, value) => this._valueChanged(key, value));
    this._securityDetails.appendChild(secColorsRow);

    this._securityPicker = document.createElement("ha-entity-picker");
    this._securityPicker.label = "Capteur d'ouvrant / Alarme / Fumée";
    this._securityPicker.includeDomains = ["binary_sensor", "alarm_control_panel"];
    this._securityPicker.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._valueChanged("security_entity", ev.detail.value);
    });
    this._securityDetails.appendChild(this._row(null, this._securityPicker));
    this._alertsCollapsibleWrapper.appendChild(this._securityDetails);

    wrapper.appendChild(this._alertsCollapsibleWrapper);

    alertsSectionHeader.querySelector("#collapse-alerts-btn").addEventListener("click", () => {
      this._collapsedSections.alerts = !this._collapsedSections.alerts;
      this._updateCollapseStates();
    });

    this.shadowRoot.appendChild(wrapper);
    this._updateCollapseStates();
  }

  _updateCollapseStates() {
    const designBtn = this.shadowRoot.getElementById("collapse-design-btn");
    if (designBtn) {
      if (this._collapsedSections.design) {
        this._designCollapsibleWrapper.classList.add("collapsed");
        designBtn.textContent = "▶ Afficher";
      } else {
        this._designCollapsibleWrapper.classList.remove("collapsed");
        designBtn.textContent = "▼ Masquer";
      }
    }

    const telBtn = this.shadowRoot.getElementById("collapse-telemetry-btn");
    if (telBtn) {
      if (this._collapsedSections.telemetry) {
        this._telemetryCollapsibleContent.classList.add("collapsed");
        telBtn.textContent = "▶ Afficher";
      } else {
        this._telemetryCollapsibleContent.classList.remove("collapsed");
        telBtn.textContent = "▼ Masquer";
      }
    }

    const barsBtn = this.shadowRoot.getElementById("collapse-bars-btn");
    if (barsBtn) {
      if (this._collapsedSections.bars) {
        this._barsCollapsibleWrapper.classList.add("collapsed");
        barsBtn.textContent = "▶ Afficher";
      } else {
        this._barsCollapsibleWrapper.classList.remove("collapsed");
        barsBtn.textContent = "▼ Masquer";
      }
    }

    const btnsBtn = this.shadowRoot.getElementById("collapse-buttons-btn");
    if (btnsBtn) {
      if (this._collapsedSections.buttons) {
        this._buttonsCollapsibleWrapper.classList.add("collapsed");
        btnsBtn.textContent = "▶ Afficher";
      } else {
        this._buttonsCollapsibleWrapper.classList.remove("collapsed");
        btnsBtn.textContent = "▼ Masquer";
      }
    }

    const alertsBtn = this.shadowRoot.getElementById("collapse-alerts-btn");
    if (alertsBtn) {
      if (this._collapsedSections.alerts) {
        this._alertsCollapsibleWrapper.classList.add("collapsed");
        alertsBtn.textContent = "▶ Afficher";
      } else {
        this._alertsCollapsibleWrapper.classList.remove("collapsed");
        alertsBtn.textContent = "▼ Masquer";
      }
    }
  }

  _updateVisibility() {
    const hideMain = !!(this._config && this._config.hide_main_icon);
    const mainLayout = this._config && this._config.main_layout;
    const showBottomBars = !!(this._config && this._config.show_bottom_bars);
    const showButtons = !!(this._config && this._config.show_buttons);
    const showAirQuality = !!(this._config && this._config.show_air_quality);
    const showSecurity = !!(this._config && this._config.show_security_alert);
    const activeCount = (this._config && this._config.entities ? this._config.entities.length : 0);

    if ((hideMain || mainLayout === "center") && activeCount >= 2) {
      if (this._firstLayoutField) this._firstLayoutField.classList.remove("hidden");
    } else {
      if (this._firstLayoutField) this._firstLayoutField.classList.add("hidden");
    }

    if (hideMain) {
      if (this._mainIconGroup) this._mainIconGroup.classList.add("hidden");
    } else {
      if (this._mainIconGroup) this._mainIconGroup.classList.remove("hidden");
    }

    if (showAirQuality) this._airQualityDetails.classList.remove("hidden");
    else this._airQualityDetails.classList.add("hidden");

    if (showSecurity) this._securityDetails.classList.remove("hidden");
    else this._securityDetails.classList.add("hidden");

    if (showBottomBars) this._bottomBarsDetails.classList.remove("hidden");
    else this._bottomBarsDetails.classList.add("hidden");

    if (showButtons) this._bottomButtonsDetails.classList.remove("hidden");
    else this._bottomButtonsDetails.classList.add("hidden");
  }

  _syncHass() {
    if (!this._hass) return;
    if (this._presencePicker) this._presencePicker.hass = this._hass;
    if (this._actionSelector) this._actionSelector.hass = this._hass;
    if (this._airTempPicker) this._airTempPicker.hass = this._hass;
    if (this._airHumPicker) this._airHumPicker.hass = this._hass;
    if (this._securityPicker) this._securityPicker.hass = this._hass;
    if (this._airIconPicker) this._airIconPicker.hass = this._hass;
    if (this._secIconPicker) this._secIconPicker.hass = this._hass;

    this._entitiesContainer.querySelectorAll("ha-entity-picker, ha-icon-picker, ha-selector").forEach((el) => {
      el.hass = this._hass;
    });

    if (this._barsContainer) {
      this._barsContainer.querySelectorAll("ha-entity-picker, ha-icon-picker").forEach((el) => {
        el.hass = this._hass;
      });
    }

    if (this._buttonsContainer) {
      this._buttonsContainer.querySelectorAll("ha-entity-picker, ha-icon-picker, ha-selector").forEach((el) => {
        el.hass = this._hass;
      });
    }
  }

_syncValues() {
    if (!this._config) return;
    if (this._titleInput && document.activeElement !== this._titleInput) {
      if (this._titleInput.value !== (this._config.title || "")) {
        this._titleInput.value = this._config.title || "";
      }
    }
    if (this._titleColorInput && document.activeElement !== this._titleColorInput) {
      this._titleColorInput.value = this._config.title_color || "#ffffff";
    }
    if (this._cardBgInput && document.activeElement !== this._cardBgInput) {
      this._cardBgInput.value = this._config.card_background || "";
    }
    if (this._cardBgColorInput && document.activeElement !== this._cardBgColorInput) {
      const bg = this._config.card_background || "";
      if (!bg.includes("gradient")) {
        this._cardBgColorInput.value = bg || "#151d2a";
      }
    }
    if (this._cardBorderInput && document.activeElement !== this._cardBorderInput) {
      this._cardBorderInput.value = this._config.card_border_color || "#00f2fe";
    }
    if (this._cardNeonCheckbox) this._cardNeonCheckbox.checked = this._config.card_neon_effect !== false;
    if (this._alignSelect) this._alignSelect.value = this._config.title_alignment || "left";
    if (this._layoutSelect) this._layoutSelect.value = this._config.main_layout || "left";
    if (this._firstLayoutSelect) this._firstLayoutSelect.value = this._config.first_layout || "grid";
    if (this._actionSelector) {
      this._actionSelector.value = this._config.icon_tap_action || (this._config.navigation_path ? { action: "navigate", navigation_path: this._config.navigation_path } : { action: "none" });
    }
    if (this._iconPicker) this._iconPicker.value = this._config.main_icon || "";
    if (this._presencePicker) this._presencePicker.value = this._config.presence || "";
    if (this._airTempPicker) this._airTempPicker.value = this._config.air_temp_entity || "";
    if (this._airHumPicker) this._airHumPicker.value = this._config.air_humidity_entity || "";
    if (this._securityPicker) this._securityPicker.value = this._config.security_entity || "";
    if (this._airTitleInput && document.activeElement !== this._airTitleInput) this._airTitleInput.value = this._config.air_title || "";
    if (this._airIconPicker) this._airIconPicker.value = this._config.air_icon || "";
    if (this._secTitleInput && document.activeElement !== this._secTitleInput) this._secTitleInput.value = this._config.sec_title || "";
    if (this._secIconPicker) this._secIconPicker.value = this._config.sec_icon || "";

    if (this._hideMainIconCheckbox) this._hideMainIconCheckbox.checked = !!this._config.hide_main_icon;
    if (this._hideTelemetryCheckbox) this._hideTelemetryCheckbox.checked = !!this._config.hide_telemetry;
    if (this._showAirQualityCheckbox) this._showAirQualityCheckbox.checked = !!this._config.show_air_quality;
    if (this._showSecurityCheckbox) this._showSecurityCheckbox.checked = !!this._config.show_security_alert;
    if (this._showBottomBarsCheckbox) this._showBottomBarsCheckbox.checked = !!this._config.show_bottom_bars;
    if (this._showButtonsCheckbox) this._showButtonsCheckbox.checked = !!this._config.show_buttons;

    const entities = this._config.entities || [];
    const bars = this._config.bars || [];
    const buttons = this._config.buttons || [];

    if (this._dynamicLayoutsContainer) {
      this._dynamicLayoutsContainer.innerHTML = "";
      const extraItems = entities.slice(2);
      if (extraItems.length > 0) {
        let i = 0;
        let pairCounter = 0;
        while (i < extraItems.length) {
          const item1 = extraItems[i];
          const item2 = extraItems[i + 1];
          if (!item2) break;

          const pairLayoutKey = pairCounter === 0 ? "fourth_layout" : `extra_layout_${pairCounter}`;
          const currentVal = this._config[pairLayoutKey] || "grid";

          const absoluteIndex1 = i + 2;
          const absoluteIndex2 = i + 3;

          const fieldDiv = document.createElement("div");
          fieldDiv.className = "field";
          const label = document.createElement("label");
          label.textContent = `Affichage des entités #${absoluteIndex1 + 1} et #${absoluteIndex2 + 1}`;
          
          const select = document.createElement("select");
          select.innerHTML = `<option value="grid">Côte à côte</option><option value="full">L'une au-dessus de l'autre</option>`;
          select.value = currentVal;

          select.addEventListener("change", () => this._valueChanged(pairLayoutKey, select.value));
          fieldDiv.appendChild(label);
          fieldDiv.appendChild(select);
          this._dynamicLayoutsContainer.appendChild(fieldDiv);

          if (currentVal === "full") i += 1;
          else i += 2;
          pairCounter++;
        }
      }
    }

    // Gestion propre du conteneur des entités de télémétrie
    this._entitiesContainer.innerHTML = "";
    entities.forEach((item, index) => {
      const box = document.createElement("div");
      box.className = "entity-editor-box";
      box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #00f2fe; font-size: 13px;">Entité #${index + 1}</strong>
          <button class="btn btn-danger delete-btn" type="button">Supprimer</button>
        </div>
      `;

      const entityPicker = document.createElement("ha-entity-picker");
      entityPicker.label = `Entité ${index + 1}`;
      entityPicker.value = item.entity || "";
      if (this._hass) entityPicker.hass = this._hass;
      entityPicker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._updateEntityProperty(index, "entity", ev.detail.value);
      });
      box.appendChild(entityPicker);

      const iconPicker = document.createElement("ha-icon-picker");
      iconPicker.label = "Icône personnalisée";
      iconPicker.value = item.icon || "";
      if (this._hass) iconPicker.hass = this._hass;
      iconPicker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._updateEntityProperty(index, "icon", ev.detail.value);
      });
      box.appendChild(iconPicker);

      const colorsRow = this._buildColorGrid([
        { label: "Bordure", key: "color", value: item.color || "#00f2fe" },
        { label: "Texte", key: "text_color", value: item.text_color || item.color || "#00f2fe" },
        { label: "Icône", key: "icon_color", value: item.icon_color || "#ffffff" },
      ], (key, value) => this._updateEntityProperty(index, key, value));
      box.appendChild(colorsRow);

      const actionField = document.createElement("div");
      actionField.className = "field";
      actionField.innerHTML = `<label>Action au clic</label>`;
      const actionSelector = document.createElement("ha-selector");
      actionSelector.selector = { ui_action: {} };
      actionSelector.value = item.action || { action: "more-info" };
      if (this._hass) actionSelector.hass = this._hass;
      actionSelector.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._updateEntityProperty(index, "action", ev.detail.value);
      });
      actionField.appendChild(actionSelector);
      box.appendChild(actionField);

      box.querySelector(".delete-btn").addEventListener("click", () => {
        const entitiesCopy = [...(this._config.entities || [])];
        entitiesCopy.splice(index, 1);
        this._valueChanged("entities", entitiesCopy);
        this._syncValues();
      });

      this._entitiesContainer.appendChild(box);
    });

    // Gestion propre du conteneur des barres graduées
    this._barsContainer.innerHTML = "";
    bars.forEach((bar, index) => {
      const box = document.createElement("div");
      box.className = "bar-editor-box";
      box.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: #00f2fe; font-size: 13px;">Barre #${index + 1}</strong>
          <button class="btn btn-danger delete-btn" type="button">Supprimer</button>
        </div>
      `;

      const entityPicker = document.createElement("ha-entity-picker");
      entityPicker.label = "Entité (Capteur)";
      entityPicker.value = bar.entity || "";
      if (this._hass) entityPicker.hass = this._hass;
      entityPicker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._updateBarProperty(index, "entity", ev.detail.value);
      });
      box.appendChild(entityPicker);

      const nameField = document.createElement("div");
      nameField.className = "field";
      nameField.innerHTML = `<label>Nom personnalisé</label>`;
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.value = bar.name || "";
      nameInput.addEventListener("input", (e) => this._updateBarProperty(index, "name", e.target.value, false));
      nameField.appendChild(nameInput);
      box.appendChild(nameField);

      const iconPicker = document.createElement("ha-icon-picker");
      iconPicker.label = "Icône personnalisée";
      iconPicker.value = bar.icon || "";
      if (this._hass) iconPicker.hass = this._hass;
      iconPicker.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._updateBarProperty(index, "icon", ev.detail.value);
      });
      box.appendChild(iconPicker);

      const barColorsRow = this._buildColorGrid([
        { label: "Couleur Début", key: "color", value: bar.color || "#00f2fe" },
        { label: "Couleur Fin", key: "color_end", value: bar.color_end || "" },
        { label: "Couleur Texte", key: "text_color", value: bar.text_color || bar.color || "#00f2fe" },
        { label: "Couleur Icône", key: "icon_color", value: bar.icon_color || bar.color || "#00f2fe" },
      ], (key, value) => this._updateBarProperty(index, key, value, false));
      box.appendChild(barColorsRow);

      const limitsRow = document.createElement("div");
      limitsRow.style.display = "grid";
      limitsRow.style.gridTemplateColumns = "1fr 1fr";
      limitsRow.style.gap = "10px";
      limitsRow.innerHTML = `
        <div class="field"><label>Minimum</label><input type="number" class="min-input" value="${bar.min !== undefined && bar.min !== null ? bar.min : ""}"></div>
        <div class="field"><label>Maximum</label><input type="number" class="max-input" value="${bar.max !== undefined && bar.max !== null ? bar.max : ""}"></div>
      `;
      limitsRow.querySelector(".min-input").addEventListener("input", (e) => this._updateBarProperty(index, "min", e.target.value === "" ? "" : parseFloat(e.target.value), false));
      limitsRow.querySelector(".max-input").addEventListener("input", (e) => this._updateBarProperty(index, "max", e.target.value === "" ? "" : parseFloat(e.target.value), false));
      box.appendChild(limitsRow);

      box.querySelector(".delete-btn").addEventListener("click", () => {
        const barsCopy = [...(this._config.bars || [])];
        barsCopy.splice(index, 1);
        this._valueChanged("bars", barsCopy);
        this._syncValues();
      });

      this._barsContainer.appendChild(box);
    });

    // Gestion propre du conteneur des boutons de commandes
    if (this._buttonsContainer) {
      this._buttonsContainer.innerHTML = "";
      getButtonRows(buttons, this._config).forEach(({ rowIndex, perRow: currentPerRow, startIndex, rowButtons }) => {
        const rowLayoutKey = `row_per_row_${rowIndex}`;

        const rowLayoutContainer = document.createElement("div");
        rowLayoutContainer.className = "row-layout-box";
        
        const rowHeader = document.createElement("div");
        rowHeader.style.display = "flex";
        rowHeader.style.justifyContent = "space-between";
        rowHeader.style.alignItems = "center";
        rowHeader.style.marginBottom = "8px";
        
        const selectPerRow = document.createElement("select");
        selectPerRow.style.width = "130px";
        selectPerRow.style.padding = "4px";
        [1, 2, 3, 4].forEach(n => {
          const o = document.createElement("option");
          o.value = n;
          o.textContent = `${n} bouton${n > 1 ? 's' : ''}`;
          selectPerRow.appendChild(o);
        });
        selectPerRow.value = currentPerRow;
        selectPerRow.addEventListener("change", () => this._valueChanged(rowLayoutKey, parseInt(selectPerRow.value)));
        
        rowHeader.innerHTML = `<strong style="font-size: 12px; color: #00f2fe;">Ligne #${rowIndex + 1}</strong>`;
        const labelWrap = document.createElement("div");
        labelWrap.style.display = "flex";
        labelWrap.style.alignItems = "center";
        labelWrap.style.gap = "8px";
        labelWrap.innerHTML = `<label style="font-size:12px;">Par ligne :</label>`;
        labelWrap.appendChild(selectPerRow);
        rowHeader.appendChild(labelWrap);
        rowLayoutContainer.appendChild(rowHeader);

        rowButtons.forEach((btn, localIndex) => {
          const index = startIndex + localIndex;
          const box = document.createElement("div");
          box.className = "btn-editor-box";
          box.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #cbd5e1; font-size: 12px;">Bouton #${index + 1}</span>
              <button class="btn btn-danger delete-btn" type="button">Supprimer</button>
            </div>
          `;

          const entityPicker = document.createElement("ha-entity-picker");
          entityPicker.label = "Entité (Cible du bouton)";
          entityPicker.value = btn.entity || "";
          if (this._hass) entityPicker.hass = this._hass;
          entityPicker.addEventListener("value-changed", (ev) => {
            ev.stopPropagation();
            this._updateButtonProperty(index, "entity", ev.detail.value);
          });
          box.appendChild(entityPicker);

          const btnNameField = document.createElement("div");
          btnNameField.className = "field";
          btnNameField.innerHTML = `<label>Nom personnalisé</label>`;
          const btnNameInput = document.createElement("input");
          btnNameInput.type = "text";
          btnNameInput.value = btn.name || "";
          btnNameInput.style.width = "100%";
          btnNameInput.style.padding = "8px";
          btnNameInput.style.background = "var(--secondary-background-color, #1a2332)";
          btnNameInput.style.border = "1px solid var(--divider-color, #334155)";
          btnNameInput.style.borderRadius = "4px";
          btnNameInput.style.color = "var(--primary-text-color, #ffffff)";
          btnNameInput.style.boxSizing = "border-box";
          
          btnNameInput.addEventListener("input", (e) => this._updateButtonProperty(index, "name", e.target.value, false));
          btnNameField.appendChild(btnNameInput);
          box.appendChild(btnNameField);

          const iconPicker = document.createElement("ha-icon-picker");
          iconPicker.label = "Icône du bouton";
          iconPicker.value = btn.icon || "";
          if (this._hass) iconPicker.hass = this._hass;
          iconPicker.addEventListener("value-changed", (ev) => {
            ev.stopPropagation();
            this._updateButtonProperty(index, "icon", ev.detail.value);
          });
          box.appendChild(iconPicker);

          const btnColorsRow = this._buildColorGrid([
            { label: "Accent/Actif", key: "color", value: btn.color || "#00f2fe" },
            { label: "Texte", key: "text_color", value: btn.text_color || "#ffffff" },
            { label: "Icône", key: "icon_color", value: btn.icon_color || "#ffffff" },
            { label: "État", key: "state_color", value: btn.state_color || "#9ca3af" },
          ], (key, value) => this._updateButtonProperty(index, key, value));
          box.appendChild(btnColorsRow);

          const actionField = document.createElement("div");
          actionField.className = "field";
          actionField.innerHTML = `<label>Action au clic du bouton</label>`;
          const actionSelector = document.createElement("ha-selector");
          actionSelector.selector = { ui_action: {} };
          actionSelector.value = btn.action || { action: "more-info" };
          if (this._hass) actionSelector.hass = this._hass;
          actionSelector.addEventListener("value-changed", (ev) => {
            ev.stopPropagation();
            this._updateButtonProperty(index, "action", ev.detail.value);
          });
          actionField.appendChild(actionSelector);
          box.appendChild(actionField);

          box.querySelector(".delete-btn").addEventListener("click", () => {
            const buttonsCopy = [...(this._config.buttons || [])];
            buttonsCopy.splice(index, 1);
            this._valueChanged("buttons", buttonsCopy);
            this._syncValues();
          });

          rowLayoutContainer.appendChild(box);
        });

        this._buttonsContainer.appendChild(rowLayoutContainer);
      });
    }

    this._updateVisibility();
  }
  
  _updateEntityProperty(index, key, value, triggerSync = true) {
    const entities = [...(this._config.entities || [])];
    if (entities[index]) {
      entities[index] = { ...entities[index], [key]: value };
      this._valueChanged("entities", entities);
      if (triggerSync) this._syncValues();
    }
  }

  _updateBarProperty(index, key, value, triggerSync = true) {
    const bars = [...(this._config.bars || [])];
    if (bars[index]) {
      bars[index] = { ...bars[index], [key]: value };
      this._valueChanged("bars", bars);
      if (triggerSync) this._syncValues.bind(this)();
    }
  }

  _updateButtonProperty(index, key, value, triggerSync = true) {
    const buttons = [...(this._config.buttons || [])];
    if (buttons[index]) {
      buttons[index] = { ...buttons[index], [key]: value };
      this._valueChanged("buttons", buttons);
      if (triggerSync) this._syncValues();
    }
  }

  _valueChanged(key, value) {
    this._config = { ...this._config, [key]: value };
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define("fielditech-multifunction-card", FieldITechMultifunctionCard);
customElements.define("fielditech-multifunction-card-editor", FieldITechMultifunctionCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "fielditech-multifunction-card",
  name: "FieldITechMultifunctionCard",
  description: "Version complète avec alertes multiples (Air, Sécurité) et options visuelles étendues.",
  preview: true,
});
