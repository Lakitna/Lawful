import { defaultsDeep, isFunction } from 'lodash-es';
import micromatch from 'micromatch';

import { ConfigManager } from './config/manager';
import { RulebookConfig, RuleConfig } from './config/types';
import { RulebookError } from './errors';
import { logger, Logger } from './log';
import { Rule } from './rule';

/**
 * A collection of rules
 *
 * @example
 * const ruleset = new Rulebook()
 *
 * ruleset.add(exampleRule)
 * ruleset.add(anotherRule)
 *
 * await ruleset.enforce('**')
 */
export class Rulebook<RI = unknown> {
    public config: ConfigManager;
    public rules: Rule<RI>[];
    private log: Logger;

    /**
     * A collection of rules
     *
     * @example
     * const ruleset = new Rulebook()
     *
     * ruleset.add(exampleRule)
     * ruleset.add(anotherRule)
     *
     * await ruleset.enforce('**')
     */
    public constructor(config?: Partial<RulebookConfig>) {
        this.config = new ConfigManager(config);
        this.rules = [];

        this.log = logger.child({});
    }

    public get length() {
        return this.rules.length;
    }

    /**
     * Loop over the rules in the set
     *
     * Works the same as `Array.forEach`
     *
     * @example
     * rulebook.forEach((rule) => {...})
     *
     * @example
     * rulebook.forEach((rule, index, allRules) => {...})
     */
    public forEach(
        function_: (value: Rule, index: number, array: Rule[]) => void,
        thisArgument?: any
    ): void {
        for (const [index, rule] of this.rules.entries()) {
            function_.call(thisArgument, rule, index, this.rules);
        }
    }

    /**
     * Add a rule or create a new empty one
     * Sets configuration
     */
    public add(
        rule: string | Rule<RI> | (() => Rule<RI> | string),
        ruleDefaultConfig?: Partial<RuleConfig>
    ): Rule<RI> {
        let normalizedRule: Rule<RI>;
        if (isFunction(rule)) {
            rule = rule();
        }
        if (rule instanceof Rule) {
            normalizedRule = rule.rulebook instanceof Rulebook ? rule.clone() : rule;
            normalizedRule.rulebook = this;
        } else {
            normalizedRule = new Rule<RI>(rule, this);
        }

        if (this.has(normalizedRule.name)) {
            throw new RulebookError(
                `The rule named '${normalizedRule.name}' already exists in the set.`,
                `Rule names must be unique.`
            );
        }

        let config = this.config.get(normalizedRule.name);
        if (ruleDefaultConfig) {
            config =
                config._specificity === 0
                    ? defaultsDeep(ruleDefaultConfig, config)
                    : defaultsDeep(config, ruleDefaultConfig);
        }
        normalizedRule.config(config);

        this.rules.push(normalizedRule);
        this.rules.sort((a, b) => {
            if (a.specificity > b.specificity) return 1;
            if (a.specificity < b.specificity) return -1;
            return 0;
        });

        return normalizedRule;
    }

    /**
     * Returns true if the ruleset contains the given rule name pattern
     */
    public has(globPattern: string): boolean {
        const matcher = micromatch.matcher(globPattern);
        return this.rules.some((rule) => matcher(rule.name));
    }

    /**
     * Return rules matching filter in a new rule book
     * Opposite of omit()
     */
    public filter(globPattern: string): Rulebook<RI> {
        const matcher = micromatch.matcher(globPattern);

        const set = new Rulebook<RI>(this.config.full);
        for (const rule of this.rules) {
            if (matcher(rule.name)) {
                set.add(rule);
            }
        }
        return set;
    }

    /**
     * Return rules not matching filter in a new rule book
     * Opposite of filter()
     */
    public omit(globPattern: string) {
        return this.filter('!' + globPattern);
    }

    /**
     * Enforce rules in the set
     */
    public async enforce(globPattern: string, input: RI) {
        if (this.length === 0) {
            this.log.warn('No rules to enforce. Book is empty');
            return this;
        }

        const matcher = micromatch.matcher(globPattern);
        const subSet = this.rules.filter((rule) => matcher(rule.name));

        if (subSet.length === 0) {
            this.log.warn(`No rules to enforce for name pattern '${globPattern}'`);
            return this;
        }

        for (const rule of subSet) {
            await rule.enforce(input);
        }

        return this;
    }
}
