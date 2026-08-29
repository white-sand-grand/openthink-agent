import capitalize from 'lodash-es/capitalize.js';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useExitOnCtrlCDWithKeybindings } from 'src/hooks/useExitOnCtrlCDWithKeybindings.js';
import { type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, logEvent } from 'src/services/analytics/index.js';
import { FAST_MODE_MODEL_DISPLAY, isFastModeAvailable, isFastModeCooldown, isFastModeEnabled } from 'src/utils/fastMode.js';
import { Box, Text } from '../ink.js';
import { useKeybindings } from '../keybindings/useKeybinding.js';
import { useAppState, useSetAppState } from '../state/AppState.js';
import { convertEffortValueToLevel, type EffortLevel, getDefaultEffortForModel, modelSupportsEffort, modelSupportsMaxEffort, resolvePickerEffortPersistence, toPersistableEffort } from '../utils/effort.js';
import { getDefaultMainLoopModel, type ModelSetting, modelDisplayString, parseUserSpecifiedModel } from '../utils/model/model.js';
import { getModelOptions } from '../utils/model/modelOptions.js';
import { getSettingsForSource, updateSettingsForSource } from '../utils/settings/settings.js';
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js';
import { Select } from './CustomSelect/index.js';
import { ProviderPicker, getProviderPickerEntryLabel } from './ProviderPicker.js';
import { Byline } from './design-system/Byline.js';
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js';
import { Pane } from './design-system/Pane.js';
import { effortLevelToSymbol } from './EffortIndicator.js';
export type Props = {
  initial: string | null;
  sessionModel?: ModelSetting;
  onSelect: (model: string | null, effort: EffortLevel | undefined) => void;
  onCancel?: () => void;
  isStandaloneCommand?: boolean;
  showFastModeNotice?: boolean;
  /** Overrides the dim header line below "Select model". */
  headerText?: string;
  /**
   * When true, skip writing effortLevel to userSettings on selection.
   * Used by the assistant installer wizard where the model choice is
   * project-scoped (written to the assistant's .openthink/settings.json via
   * install.ts) and should not leak to the user's global ~/.openthink/settings.
   */
  skipSettingsWrite?: boolean;
};
const NO_PREFERENCE = '__NO_PREFERENCE__';
const PROVIDERS_ENTRY = '__providers__';
export function ModelPicker(t0) {
  const {
    initial,
    sessionModel,
    onSelect,
    onCancel,
    isStandaloneCommand,
    showFastModeNotice,
    headerText,
    skipSettingsWrite
  } = t0;
  const setAppState = useSetAppState();
  const exitState = useExitOnCtrlCDWithKeybindings();
  const initialValue = initial === null ? NO_PREFERENCE : initial;
  const [focusedValue, setFocusedValue] = useState(initialValue);
  const [view, setView] = useState('models');
  const isFastMode = useAppState(_temp);
  const [hasToggledEffort, setHasToggledEffort] = useState(false);
  const effortValue = useAppState(_temp2);
  const initialEffort = effortValue !== undefined ? convertEffortValueToLevel(effortValue) : undefined;
  const [effort, setEffortState] = useState<EffortLevel | undefined>(initialEffort);
  const modelOptions = useMemo(() => getModelOptions(isFastMode ?? false), [isFastMode]);

  // Ensure the initial value is in the options list. This handles edge cases
  // where the user's current model (e.g., 'haiku' for 3P users) is not in the
  // base options but should still be selectable and shown as selected.
  const optionsWithInitial = useMemo(() => {
    if (initial !== null && !modelOptions.some(opt => opt.value === initial)) {
      return [...modelOptions, {
        value: initial,
        label: modelDisplayString(initial),
        description: 'Current model'
      }];
    }
    return modelOptions;
  }, [modelOptions, initial]);
  const providerEntry = useMemo(() => ({
    value: PROVIDERS_ENTRY,
    label: getProviderPickerEntryLabel(),
    description: 'Anthropic 兼容端点:切换提供商、配置 API Key、选用其模型'
  }), []);
  const selectOptions = useMemo(() => [...optionsWithInitial.map(opt => ({
    ...opt,
    value: opt.value === null ? NO_PREFERENCE : opt.value
  })), providerEntry], [optionsWithInitial, providerEntry]);
  const initialFocusValue = useMemo(() => selectOptions.some(_ => _.value === initialValue) ? initialValue : selectOptions[0]?.value ?? undefined, [selectOptions, initialValue]);
  const visibleCount = Math.min(10, selectOptions.length);
  const hiddenCount = Math.max(0, selectOptions.length - visibleCount);
  const focusedModelName = selectOptions.find(opt => opt.value === focusedValue)?.label;
  const focusedModel = resolveOptionModel(focusedValue);
  const focusedSupportsEffort = focusedModel ? modelSupportsEffort(focusedModel) : false;
  const focusedSupportsMax = focusedModel ? modelSupportsMaxEffort(focusedModel) : false;
  const focusedDefaultEffort = getDefaultEffortLevelForOption(focusedValue);
  // Clamp display when 'max' is selected but the focused model doesn't support it.
  // resolveAppliedEffort() does the same downgrade at API-send time.
  const displayEffort = effort === 'max' && !focusedSupportsMax ? 'high' : effort;
  const handleFocus = useCallback((value: string) => {
    setFocusedValue(value);
    if (!hasToggledEffort && effortValue === undefined) {
      setEffortState(getDefaultEffortLevelForOption(value));
    }
  }, [hasToggledEffort, effortValue]);

  // Effort level cycling keybindings
  const handleCycleEffort = useCallback((direction: 'left' | 'right') => {
    if (!focusedSupportsEffort) return;
    setEffortState(prev => cycleEffortLevel(prev ?? focusedDefaultEffort, direction, focusedSupportsMax));
    setHasToggledEffort(true);
  }, [focusedSupportsEffort, focusedSupportsMax, focusedDefaultEffort]);
  useKeybindings({
    'modelPicker:decreaseEffort': () => handleCycleEffort('left'),
    'modelPicker:increaseEffort': () => handleCycleEffort('right')
  }, {
    context: 'ModelPicker'
  });
  function handleSelect(value: string): void {
    if (value === PROVIDERS_ENTRY) {
      setView('providers');
      return;
    }
    logEvent('tengu_model_command_menu_effort', {
      effort: effort as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
    });
    if (!skipSettingsWrite) {
      // Prior comes from userSettings on disk — NOT merged settings (which
      // includes project/policy layers that must not leak into the user's
      // global ~/.openthink/settings.json), and NOT AppState.effortValue (which
      // includes session-ephemeral sources like --effort CLI flag).
      // See resolvePickerEffortPersistence JSDoc.
      const effortLevel = resolvePickerEffortPersistence(effort, getDefaultEffortLevelForOption(value), getSettingsForSource('userSettings')?.effortLevel, hasToggledEffort);
      const persistable = toPersistableEffort(effortLevel);
      if (persistable !== undefined) {
        updateSettingsForSource('userSettings', {
          effortLevel: persistable
        });
      }
      setAppState(prev => ({
        ...prev,
        effortValue: effortLevel
      }));
    }
    const selectedModel = resolveOptionModel(value);
    const selectedEffort = hasToggledEffort && selectedModel && modelSupportsEffort(selectedModel) ? effort : undefined;
    if (value === NO_PREFERENCE) {
      onSelect(null, selectedEffort);
      return;
    }
    onSelect(value, selectedEffort);
  }
  const content = <Box flexDirection="column">
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>Select model</Text>
          <Text dimColor>{headerText ?? 'Switch between Claude models. Applies to this session and future OpenThink sessions. For other/previous model names, specify with --model.'}</Text>
          {sessionModel && <Text dimColor>Currently using {modelDisplayString(sessionModel)} for this session (set by plan mode). Selecting a model will undo this.</Text>}
        </Box>

        {view === 'providers' ? <ProviderPicker onBack={() => setView('models')} onPicked={modelId => {
        setView('models');
        handleSelect(modelId);
      }} /> : <Box flexDirection="column" marginBottom={1}>
            <Box flexDirection="column">
              <Select defaultValue={initialValue} defaultFocusValue={initialFocusValue} options={selectOptions} onChange={handleSelect} onFocus={handleFocus} onCancel={onCancel ?? (() => {})} visibleOptionCount={visibleCount} />
            </Box>
            {hiddenCount > 0 && <Box paddingLeft={3}>
                <Text dimColor>and {hiddenCount} more…</Text>
              </Box>}
          </Box>}

        {view === 'models' && <Box marginBottom={1} flexDirection="column">
            {focusedSupportsEffort ? <Text dimColor><EffortLevelIndicator effort={displayEffort} />{" "}{capitalize(displayEffort)} effort{displayEffort === focusedDefaultEffort ? " (default)" : ""}{" "}<Text color="subtle">← → to adjust</Text></Text> : <Text color="subtle"><EffortLevelIndicator effort={undefined} /> Effort not supported{focusedModelName ? ` for ${focusedModelName}` : ""}</Text>}
          </Box>}

        {view === 'models' && (isFastModeEnabled() ? showFastModeNotice ? <Box marginBottom={1}>
              <Text dimColor>Fast mode is <Text bold>ON</Text> and available with{" "}{FAST_MODE_MODEL_DISPLAY} only (/fast). Switching to other models turn off fast mode.</Text>
            </Box> : isFastModeAvailable() && !isFastModeCooldown() ? <Box marginBottom={1}>
              <Text dimColor>Use <Text bold>/fast</Text> to turn on Fast mode ({FAST_MODE_MODEL_DISPLAY} only).</Text>
            </Box> : null : null)}
      </Box>

      {isStandaloneCommand && <Text dimColor italic>{exitState.pending ? <>Press {exitState.keyName} again to exit</> : <Byline><KeyboardShortcutHint shortcut="Enter" action="confirm" /><ConfigurableShortcutHint action="select:cancel" context="Select" fallback="Esc" description="exit" /></Byline>}</Text>}
    </Box>;
  if (!isStandaloneCommand) {
    return content;
  }
  return <Pane color="permission">{content}</Pane>;
}
function _temp(s) {
  return isFastModeEnabled() ? s.fastMode : false;
}
function _temp2(s) {
  return s.effortValue;
}
function resolveOptionModel(value?: string): string | undefined {
  if (!value) return undefined;
  return value === NO_PREFERENCE ? getDefaultMainLoopModel() : parseUserSpecifiedModel(value);
}
function EffortLevelIndicator({
  effort
}: {
  effort?: EffortLevel
}): React.ReactNode {
  return <Text color={effort ? 'claude' : 'subtle'}>
      {effortLevelToSymbol(effort ?? 'low')}
    </Text>;
}
function cycleEffortLevel(current: EffortLevel, direction: 'left' | 'right', includeMax: boolean): EffortLevel {
  const levels: EffortLevel[] = includeMax ? ['low', 'medium', 'high', 'max'] : ['low', 'medium', 'high'];
  // If the current level isn't in the cycle (e.g. 'max' after switching to a
  // non-Opus model), clamp to 'high'.
  const idx = levels.indexOf(current);
  const currentIndex = idx !== -1 ? idx : levels.indexOf('high');
  if (direction === 'right') {
    return levels[(currentIndex + 1) % levels.length]!;
  } else {
    return levels[(currentIndex - 1 + levels.length) % levels.length]!;
  }
}
function getDefaultEffortLevelForOption(value?: string): EffortLevel {
  const resolved = resolveOptionModel(value) ?? getDefaultMainLoopModel();
  const defaultValue = getDefaultEffortForModel(resolved);
  return defaultValue !== undefined ? convertEffortValueToLevel(defaultValue) : 'high';
}
