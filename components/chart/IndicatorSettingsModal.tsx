import React from 'react';
import { IndicatorSettingsDefinition, IndicatorSettingsValues } from '../../types';

type IndicatorSettingsModalProps = {
  indicatorName: string;
  definition: IndicatorSettingsDefinition;
  values: IndicatorSettingsValues;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onChangeValue: (fieldId: string, value: any) => void;
  onResetDefaults: () => void;
  onCancel: () => void;
  onApply: () => void;
};

export const IndicatorSettingsModal: React.FC<IndicatorSettingsModalProps> = ({
  indicatorName,
  definition,
  values,
  activeTab,
  onTabChange,
  onChangeValue,
  onResetDefaults,
  onCancel,
  onApply,
}) => {
  const tabsFromDefinition = definition.tabs && definition.tabs.length > 0
    ? definition.tabs
    : Array.from(
        new Set(
          definition.fields
            .map((field) => field.tab)
            .filter((tab): tab is string => Boolean(tab))
        )
      );

  const tabs = tabsFromDefinition.length ? tabsFromDefinition : ['Inputs'];
  const showTabs = tabs.length > 1;
  const currentTab = tabs.includes(activeTab) ? activeTab : tabs[0];

  const fieldsByTab = definition.fields.reduce<Record<string, typeof definition.fields>>((acc, field) => {
    const tab = field.tab && tabs.includes(field.tab) ? field.tab : tabs[0];
    if (!acc[tab]) acc[tab] = [];
    acc[tab].push(field);
    return acc;
  }, {});

  const fieldsInCurrentTab = fieldsByTab[currentTab] || [];

  const sections = Array.from(
    new Set(
      fieldsInCurrentTab
        .map((field) => field.section || '')
        .map((name) => name.trim())
    )
  );

  const renderFieldControl = (fieldId: string, type: string) => {
    const field = definition.fields.find((item) => item.id === fieldId);
    if (!field) return null;
    const rawValue = values[field.id];
    const baseValue = rawValue !== undefined ? rawValue : field.defaultValue;

    const commonInputClasses =
      'h-7 px-2 rounded border border-slate-200 focus:border-slate-400 outline-none bg-white text-xs text-slate-800';

    if (type === 'number') {
      const numericValue =
        typeof baseValue === 'number'
          ? baseValue
          : Number(baseValue ?? field.defaultValue ?? 0) || 0;
      return (
        <input
          id={`indicator-field-${field.id}`}
          type="number"
          inputMode="decimal"
          className={`${commonInputClasses} text-right font-mono`}
          value={numericValue}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(event) => {
            const next = event.target.value === '' ? '' : Number(event.target.value);
            onChangeValue(field.id, next);
          }}
        />
      );
    }

    if (type === 'select') {
      const stringValue =
        typeof baseValue === 'string'
          ? baseValue
          : String(baseValue ?? field.defaultValue ?? '');
      return (
        <select
          id={`indicator-field-${field.id}`}
          className={`${commonInputClasses} pr-6`}
          value={stringValue}
          onChange={(event) => onChangeValue(field.id, event.target.value)}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'boolean') {
      const checked =
        typeof baseValue === 'boolean'
          ? baseValue
          : Boolean(baseValue ?? field.defaultValue);
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`w-9 h-4 rounded-full border transition-colors duration-150 ${
              checked
                ? 'bg-slate-900 border-slate-900'
                : 'bg-slate-100 border-slate-300'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-150 ${
                checked ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          <input
            id={`indicator-field-${field.id}`}
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={(event) => onChangeValue(field.id, event.target.checked)}
          />
        </label>
      );
    }

    if (type === 'color') {
      const colorValue =
        typeof baseValue === 'string'
          ? baseValue
          : typeof field.defaultValue === 'string'
          ? field.defaultValue
          : '#2962FF';
      return (
        <div className="flex items-center gap-2">
          <input
            id={`indicator-field-${field.id}`}
            type="color"
            value={colorValue}
            onChange={(event) => onChangeValue(field.id, event.target.value)}
            className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
          />
          <span className="text-[11px] font-mono text-slate-500">{colorValue}</span>
        </div>
      );
    }

    // text
    const stringValue =
      typeof baseValue === 'string'
        ? baseValue
        : String(baseValue ?? field.defaultValue ?? '');

    return (
      <input
        id={`indicator-field-${field.id}`}
        type="text"
        className={commonInputClasses}
        value={stringValue}
        placeholder={field.placeholder}
        onChange={(event) => onChangeValue(field.id, event.target.value)}
      />
    );
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
      <div className="pointer-events-auto w-[340px] max-w-sm bg-white border border-slate-200 shadow-[0_18px_40px_rgba(15,23,42,0.16)] rounded-lg">
        <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 leading-tight">
              {definition.title || indicatorName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-900 text-xs px-1"
          >
            ×
          </button>
        </div>

        {showTabs ? (
          <div className="px-4 pt-2 pb-1.5 border-b border-slate-100 flex gap-4 text-xs">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`pb-1 -mb-px border-b text-xs transition-colors ${
                  tab === currentTab
                    ? 'border-slate-900 text-slate-900 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 pt-2 pb-1.5 border-b border-slate-100">
            <p className="text-[11px] font-medium text-slate-500">
              {tabs[0] || 'Inputs'}
            </p>
          </div>
        )}

        <div className="px-4 py-3 max-h-[320px] overflow-y-auto space-y-4">
          {sections.map((sectionName) => {
            const sectionFields = fieldsInCurrentTab.filter(
              (field) => (field.section || '').trim() === sectionName
            );
            if (!sectionFields.length) return null;

            return (
              <div key={sectionName || 'default'} className="space-y-2.5">
                {sectionName ? (
                  <p className="text-[11px] font-semibold text-slate-500">
                    {sectionName}
                  </p>
                ) : null}
                <div className="space-y-2.5">
                  {sectionFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`indicator-field-${field.id}`}
                          className="block text-[11px] font-medium text-slate-600 truncate"
                        >
                          {field.label}
                        </label>
                        {field.description ? (
                          <p className="mt-0.5 text-[10px] text-slate-400 leading-snug">
                            {field.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="w-[140px] flex justify-end">
                        {renderFieldControl(field.id, field.type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {!fieldsInCurrentTab.length && (
            <p className="text-[11px] text-slate-500">
              This indicator does not expose configurable settings yet.
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-b-lg">
          <button
            type="button"
            onClick={onResetDefaults}
            className="text-[11px] font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded-sm hover:bg-slate-100"
          >
            Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-[11px] rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="px-3 py-1.5 text-[11px] rounded-full bg-slate-900 text-white hover:bg-slate-800"
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
