// src/utils/componentsV2.ts
import { AST_NODE_TYPES as AST_NODE_TYPES3 } from "@typescript-eslint/utils";

// src/utils/typeUtils.ts
import { AST_NODE_TYPES as AST_NODE_TYPES2 } from "@typescript-eslint/utils";
import { SymbolFlags, TypeFlags } from "typescript";

// src/utils/utils.ts
import { AST_NODE_TYPES } from "@typescript-eslint/utils";
function methodName(call) {
  const { callee } = call;
  if (callee.type !== AST_NODE_TYPES.MemberExpression || callee.computed) return void 0;
  if (callee.property.type !== AST_NODE_TYPES.Identifier) return void 0;
  return callee.property.name;
}
function isChainTop(node) {
  const { parent } = node;
  return parent.type !== AST_NODE_TYPES.MemberExpression || parent.object !== node;
}
function collectChain(top) {
  const calls = [];
  let current = top;
  while (current.type === AST_NODE_TYPES.CallExpression && current.callee.type === AST_NODE_TYPES.MemberExpression) {
    calls.push(current);
    current = current.callee.object;
  }
  return calls;
}
function chainRoot(top) {
  let current = top;
  while (current.type === AST_NODE_TYPES.CallExpression && current.callee.type === AST_NODE_TYPES.MemberExpression) {
    current = current.callee.object;
  }
  return current;
}
function enclosingChainTop(node) {
  let current = node;
  while (current.parent?.type === AST_NODE_TYPES.MemberExpression && current.parent.object === current && current.parent.parent.type === AST_NODE_TYPES.CallExpression && current.parent.parent.callee === current.parent) {
    current = current.parent.parent;
  }
  return current;
}
function lastCall(calls, name) {
  return calls.find((call) => methodName(call) === name);
}
function calleeProperty(call) {
  return call.callee.type === AST_NODE_TYPES.MemberExpression ? call.callee.property : call;
}
function resolveConstInit(sourceCode, identifier) {
  const variable = sourceCode.getScope(identifier).references.find((ref) => ref.identifier === identifier)?.resolved;
  const definition = variable?.defs[0];
  if (definition?.node.type !== AST_NODE_TYPES.VariableDeclarator) return void 0;
  if (variable?.references.some((ref) => ref.isWrite() && !ref.init)) return void 0;
  return definition.node.init ?? void 0;
}
function propertyKeyIs(prop, name) {
  if (prop.computed) return false;
  const { key } = prop;
  if (key.type === AST_NODE_TYPES.Identifier) return key.name === name;
  return key.value === name;
}
function getProperty(node, name) {
  return node.properties.find(
    (prop) => prop.type === AST_NODE_TYPES.Property && propertyKeyIs(prop, name)
  );
}
function constructorData(root) {
  if (root.type !== AST_NODE_TYPES.NewExpression) return void 0;
  const arg = root.arguments[0];
  if (arg === void 0 || arg.type === AST_NODE_TYPES.SpreadElement) return void 0;
  const value = unwrapAssertions(arg);
  return value.type === AST_NODE_TYPES.ObjectExpression ? value : void 0;
}
function outermostAssertion(node) {
  let current = node;
  while (current.parent.type === AST_NODE_TYPES.TSAsExpression || current.parent.type === AST_NODE_TYPES.TSTypeAssertion || current.parent.type === AST_NODE_TYPES.TSSatisfiesExpression || current.parent.type === AST_NODE_TYPES.TSNonNullExpression) {
    current = current.parent;
  }
  return current;
}
function unwrapAssertions(expr) {
  let current = expr;
  while (current.type === AST_NODE_TYPES.TSAsExpression || current.type === AST_NODE_TYPES.TSTypeAssertion || current.type === AST_NODE_TYPES.TSSatisfiesExpression) {
    current = current.expression;
  }
  return current;
}

// src/utils/typeUtils.ts
function isFromDiscordJs(symbol) {
  const file = symbol?.declarations?.[0]?.getSourceFile().fileName;
  return file !== void 0 && (/[\\/]discord\.js[\\/]|[\\/]@discordjs[\\/]/.test(file) || file.includes("/discord.js/") || file.includes("/@discordjs/"));
}
function asClassOrInterface(type) {
  if (type.isClassOrInterface()) return type;
  const target = type.target;
  if (target !== void 0 && target !== type && target.isClassOrInterface()) return target;
  return void 0;
}
function walkBaseChain(checker, type, match) {
  const seen = /* @__PURE__ */ new Set();
  const stack = [type];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === void 0 || seen.has(current)) continue;
    seen.add(current);
    if (current.isUnionOrIntersection()) {
      stack.push(...current.types);
      continue;
    }
    const symbol = current.getSymbol();
    if (symbol !== void 0 && match(symbol)) return true;
    const iface = asClassOrInterface(current);
    if (iface !== void 0) stack.push(...checker.getBaseTypes(iface));
  }
  return false;
}
function extendsDjsType(checker, type, names) {
  const wanted = typeof names === "string" ? /* @__PURE__ */ new Set([names]) : names;
  return walkBaseChain(checker, type, (symbol) => wanted.has(symbol.getName()) && isFromDiscordJs(symbol));
}
function trustedConstructorData(root, rootType) {
  const data = constructorData(root);
  return data !== void 0 && isFromDiscordJs(rootType.getSymbol()) ? data : void 0;
}
function staticNumber(node, services) {
  if (node === void 0 || node.type === AST_NODE_TYPES2.SpreadElement || node.type === AST_NODE_TYPES2.AssignmentPattern || node.type === AST_NODE_TYPES2.TSEmptyBodyFunctionExpression) {
    return void 0;
  }
  const target = unwrapAssertions(node);
  if (target.type === AST_NODE_TYPES2.Literal && typeof target.value === "number") return target.value;
  const type = services.getTypeAtLocation(target);
  return type.isNumberLiteral() ? type.value : void 0;
}
function booleanLiteralValue(checker, type) {
  if ((type.flags & TypeFlags.BooleanLiteral) === 0) return void 0;
  return checker.typeToString(type) === "true";
}
function extendsSeedcordType(checker, type, names) {
  const wanted = typeof names === "string" ? /* @__PURE__ */ new Set([names]) : names;
  return walkBaseChain(checker, type, (symbol) => wanted.has(symbol.getName()));
}

// src/utils/componentsV2.ts
var V2_BUILDERS = /* @__PURE__ */ new Set([
  "ContainerBuilder",
  "SectionBuilder",
  "TextDisplayBuilder",
  "MediaGalleryBuilder",
  "FileBuilder",
  "SeparatorBuilder",
  "ThumbnailBuilder"
]);
function isV2Type(type, checker) {
  return extendsDjsType(checker, type, V2_BUILDERS);
}
function arrayHoldsV2(type, checker) {
  const elementType = type?.getNumberIndexType();
  return elementType !== void 0 && isV2Type(elementType, checker);
}
function componentsValueIsV2(value, services, checker) {
  if (value.type === AST_NODE_TYPES3.ArrayExpression) {
    return value.elements.some((element) => {
      if (element === null) return false;
      if (element.type === AST_NODE_TYPES3.SpreadElement) {
        return arrayHoldsV2(services.getTypeAtLocation(element.argument), checker);
      }
      return isV2Type(services.getTypeAtLocation(element), checker);
    });
  }
  return arrayHoldsV2(services.getTypeAtLocation(value), checker);
}
function hasV2Components(node, services, checker) {
  let holdsV2 = false;
  for (const prop of node.properties) {
    if (prop.type === AST_NODE_TYPES3.Property && propertyKeyIs(prop, "components")) {
      holdsV2 = componentsValueIsV2(prop.value, services, checker);
    } else if (prop.type === AST_NODE_TYPES3.SpreadElement) {
      const symbol = services.getTypeAtLocation(prop.argument).getProperty("components");
      if (symbol !== void 0) holdsV2 = arrayHoldsV2(checker.getTypeOfSymbol(symbol), checker);
    }
  }
  return holdsV2;
}

// src/rules/no-choices-and-autocomplete.ts
import { AST_NODE_TYPES as AST_NODE_TYPES4, ESLintUtils as ESLintUtils2 } from "@typescript-eslint/utils";

// src/createRule.ts
import { ESLintUtils } from "@typescript-eslint/utils";
var createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/vybe-bot/eslint-plugin-discord/blob/main/docs/rules/${name}.md`
);

// src/rules/no-choices-and-autocomplete.ts
var OPTION_BUILDERS = /* @__PURE__ */ new Set(["SlashCommandStringOption", "SlashCommandIntegerOption", "SlashCommandNumberOption"]);
function autocompleteOn(calls, services, checker) {
  const last = calls.find((call) => methodName(call) === "setAutocomplete");
  const arg = last?.arguments[0];
  if (arg === void 0) return false;
  if (arg.type === AST_NODE_TYPES4.Literal) return arg.value === true;
  return booleanLiteralValue(checker, services.getTypeAtLocation(arg)) === true;
}
function declaresChoices(calls) {
  let has = false;
  for (const call of [...calls].reverse()) {
    const name = methodName(call);
    if (name === "addChoices") {
      if (call.arguments.some((arg) => arg.type !== AST_NODE_TYPES4.SpreadElement)) has = true;
    } else if (name === "setChoices") {
      has = call.arguments.some((arg) => {
        if (arg.type === AST_NODE_TYPES4.SpreadElement) return false;
        if (arg.type === AST_NODE_TYPES4.ArrayExpression) {
          return arg.elements.some((el) => el !== null && el.type !== AST_NODE_TYPES4.SpreadElement);
        }
        return true;
      });
    }
  }
  return has;
}
var no_choices_and_autocomplete_default = createRule({
  name: "no-choices-and-autocomplete",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow both autocomplete and choices on the same slash option."
    },
    messages: {
      bothSet: "A slash option cannot enable autocomplete and declare choices at once. Building that throws a RangeError."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils2.getParserServices(context);
    const checker = services.program.getTypeChecker();
    return {
      CallExpression(node) {
        if (!isChainTop(node)) return;
        if (!extendsDjsType(checker, services.getTypeAtLocation(chainRoot(node)), OPTION_BUILDERS)) return;
        const calls = collectChain(node);
        if (autocompleteOn(calls, services, checker) && declaresChoices(calls)) {
          context.report({ node, messageId: "bothSet" });
        }
      }
    };
  }
});

// src/rules/no-conflicting-button-props.ts
import { ESLintUtils as ESLintUtils3 } from "@typescript-eslint/utils";

// src/buttons.ts
var STYLE_NAMES = {
  1: "Primary",
  2: "Secondary",
  3: "Success",
  4: "Danger",
  5: "Link",
  6: "Premium"
};
var LINK = 5;
var PREMIUM = 6;
function knownStyle(value) {
  return value !== void 0 && value in STYLE_NAMES ? value : void 0;
}
var PROP_SOURCES = [
  ["customId", "setCustomId", "custom_id"],
  ["label", "setLabel", "label"],
  ["url", "setURL", "url"],
  ["emoji", "setEmoji", "emoji"],
  ["skuId", "setSKUId", "sku_id"]
];
function gatherFacts(calls, data) {
  const props = /* @__PURE__ */ new Map();
  for (const [prop, method, key] of PROP_SOURCES) {
    const call = lastCall(calls, method);
    const site = call !== void 0 ? calleeProperty(call) : data === void 0 ? void 0 : getProperty(data, key) ?? getProperty(data, prop);
    if (site !== void 0) props.set(prop, site);
  }
  const styleSource = lastCall(calls, "setStyle")?.arguments[0] ?? (data === void 0 ? void 0 : getProperty(data, "style")?.value);
  return { props, styleSource };
}

// src/rules/no-conflicting-button-props.ts
var PREMIUM_FORBIDDEN = ["customId", "label", "url", "emoji"];
var no_conflicting_button_props_default = createRule({
  name: "no-conflicting-button-props",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow conflicting props on a button builder."
    },
    messages: {
      idAndUrl: "A button cannot set both a customId and a url.",
      linkWithCustomId: "A Link button uses a url and cannot have a customId.",
      urlOnNonLink: "A {{style}} button cannot have a url. Only a Link button takes one.",
      skuIdOnNonPremium: "A {{style}} button cannot have a skuId. Only a Premium button takes one.",
      skuIdWithProp: "A button cannot set both a skuId and a {{prop}}.",
      premiumProp: "A Premium button cannot have a {{prop}}, only a skuId."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils3.getParserServices(context);
    const checker = services.program.getTypeChecker();
    function reportPremiumProps(props) {
      for (const prop of PREMIUM_FORBIDDEN) {
        const site = props.get(prop);
        if (site === void 0) continue;
        context.report({ node: site, messageId: "premiumProp", data: { prop } });
      }
    }
    function reportConflicts(anchor, style, facts) {
      const { props } = facts;
      const customId = props.get("customId");
      const url = props.get("url");
      if (customId !== void 0 && url !== void 0) {
        context.report({ node: anchor, messageId: "idAndUrl" });
      } else if (customId !== void 0 && style === LINK) {
        context.report({ node: anchor, messageId: "linkWithCustomId" });
      } else if (url !== void 0 && style !== void 0 && style < LINK) {
        context.report({ node: url, messageId: "urlOnNonLink", data: { style: STYLE_NAMES[style] } });
      }
      const skuId = props.get("skuId");
      if (skuId === void 0) return;
      if (style !== void 0) {
        context.report({ node: skuId, messageId: "skuIdOnNonPremium", data: { style: STYLE_NAMES[style] } });
        return;
      }
      for (const prop of PREMIUM_FORBIDDEN) {
        if (props.has(prop)) {
          context.report({ node: skuId, messageId: "skuIdWithProp", data: { prop } });
        }
      }
    }
    function check(anchor, calls, root) {
      const facts = gatherFacts(calls, constructorData(root));
      if (facts.props.size === 0 && facts.styleSource === void 0) return;
      const rootType = services.getTypeAtLocation(root);
      if (!extendsDjsType(checker, rootType, "ButtonBuilder")) return;
      const trusted = gatherFacts(calls, trustedConstructorData(root, rootType));
      const style = knownStyle(staticNumber(trusted.styleSource, services));
      if (style === PREMIUM) reportPremiumProps(trusted.props);
      else reportConflicts(anchor, style, trusted);
    }
    return {
      CallExpression(node) {
        if (!isChainTop(node)) return;
        check(node, collectChain(node), chainRoot(node));
      },
      NewExpression(node) {
        if (enclosingChainTop(node) !== node) return;
        check(node, [], node);
      }
    };
  }
});

// src/rules/no-discord-limit-exceeded.ts
import { AST_NODE_TYPES as AST_NODE_TYPES5, ESLintUtils as ESLintUtils4 } from "@typescript-eslint/utils";
var LIMITS = [
  {
    builders: /* @__PURE__ */ new Set(["ActionRowBuilder"]),
    addMethods: /* @__PURE__ */ new Set(["addComponents"]),
    setMethod: "setComponents",
    dataKey: "components",
    cap: 5,
    detail: "An action row holds at most 5 components"
  },
  {
    builders: /* @__PURE__ */ new Set(["ModalBuilder"]),
    addMethods: /* @__PURE__ */ new Set(["addComponents", "addLabelComponents", "addTextDisplayComponents"]),
    setMethod: "setComponents",
    dataKey: "components",
    cap: 5,
    detail: "A modal holds at most 5 components"
  },
  {
    builders: /* @__PURE__ */ new Set(["StringSelectMenuBuilder"]),
    addMethods: /* @__PURE__ */ new Set(["addOptions"]),
    setMethod: "setOptions",
    dataKey: "options",
    cap: 25,
    detail: "A select menu holds at most 25 options"
  },
  {
    builders: /* @__PURE__ */ new Set(["EmbedBuilder"]),
    addMethods: /* @__PURE__ */ new Set(["addFields"]),
    setMethod: "setFields",
    dataKey: "fields",
    cap: 25,
    detail: "An embed holds at most 25 fields"
  },
  // the slash option builders take no constructor data
  {
    builders: /* @__PURE__ */ new Set(["SlashCommandStringOption", "SlashCommandIntegerOption", "SlashCommandNumberOption"]),
    addMethods: /* @__PURE__ */ new Set(["addChoices"]),
    setMethod: "setChoices",
    cap: 25,
    detail: "A slash option holds at most 25 choices"
  }
];
function tupleLength(type, checker) {
  if (!checker.isTupleType(type)) return void 0;
  const reference = type;
  const target = reference.target;
  const length = checker.getTypeArguments(reference).length;
  return target.minLength === length ? length : void 0;
}
function spreadCount(spread, services, checker) {
  return tupleLength(services.getTypeAtLocation(spread.argument), checker);
}
function arrayLength(array, services, checker) {
  let count = 0;
  for (const element of array.elements) {
    if (element?.type === AST_NODE_TYPES5.SpreadElement) {
      const arity = spreadCount(element, services, checker);
      if (arity === void 0) return void 0;
      count += arity;
    } else {
      count += 1;
    }
  }
  return count;
}
function callItems(call, services, checker) {
  const first = call.arguments[0];
  if (first === void 0) return 0;
  if (first.type === AST_NODE_TYPES5.ArrayExpression) return arrayLength(first, services, checker);
  if (first.type !== AST_NODE_TYPES5.SpreadElement) {
    const type = services.getTypeAtLocation(first);
    if (checker.isArrayLikeType(type)) return tupleLength(type, checker);
  }
  let count = 0;
  for (const arg of call.arguments) {
    if (arg.type === AST_NODE_TYPES5.SpreadElement) {
      const arity = spreadCount(arg, services, checker);
      if (arity === void 0) return void 0;
      count += arity;
    } else {
      count += 1;
    }
  }
  return count;
}
function countStaticItems(calls, limit, data, services, checker) {
  let count = 0;
  let matched = false;
  const seed = data !== void 0 && limit.dataKey !== void 0 ? getProperty(data, limit.dataKey) : void 0;
  if (seed !== void 0) {
    const length = seed.value.type === AST_NODE_TYPES5.ArrayExpression ? arrayLength(seed.value, services, checker) : tupleLength(services.getTypeAtLocation(seed.value), checker);
    if (length === void 0) return void 0;
    count = length;
    matched = true;
  }
  for (const call of [...calls].reverse()) {
    const name = methodName(call);
    if (name === void 0 || !limit.addMethods.has(name) && name !== limit.setMethod) continue;
    matched = true;
    const items = callItems(call, services, checker);
    if (items === void 0) return void 0;
    count = limit.addMethods.has(name) ? count + items : items;
  }
  return matched ? count : void 0;
}
var no_discord_limit_exceeded_default = createRule({
  name: "no-discord-limit-exceeded",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow exceeding a Discord builder limit with a statically-known number of items."
    },
    messages: {
      tooMany: "{{detail}}. This builder declares {{count}}."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils4.getParserServices(context);
    const checker = services.program.getTypeChecker();
    function check(anchor, calls, root) {
      const rawData = constructorData(root);
      const methods = new Set(calls.map((call) => methodName(call)));
      const relevant = LIMITS.some(
        (limit2) => methods.has(limit2.setMethod) || [...limit2.addMethods].some((m) => methods.has(m)) || rawData !== void 0 && limit2.dataKey !== void 0 && getProperty(rawData, limit2.dataKey) !== void 0
      );
      if (!relevant) return;
      const rootType = services.getTypeAtLocation(root);
      const limit = LIMITS.find((entry) => extendsDjsType(checker, rootType, entry.builders));
      if (!limit) return;
      const count = countStaticItems(calls, limit, trustedConstructorData(root, rootType), services, checker);
      if (count !== void 0 && count > limit.cap) {
        context.report({ node: anchor, messageId: "tooMany", data: { detail: limit.detail, count } });
      }
    }
    return {
      CallExpression(node) {
        if (!isChainTop(node)) return;
        check(node, collectChain(node), chainRoot(node));
      },
      NewExpression(node) {
        if (enclosingChainTop(node) !== node) return;
        check(node, [], node);
      }
    };
  }
});

// src/rules/no-mixed-message-format.ts
import { AST_NODE_TYPES as AST_NODE_TYPES6, ESLintUtils as ESLintUtils5 } from "@typescript-eslint/utils";
import { SymbolFlags as SymbolFlags2, TypeFlags as TypeFlags2 } from "typescript";
var CONTENT_FIELDS = ["content", "embeds", "poll", "stickers", "sticker_ids"];
function isDefinitelyUndefined(type) {
  return (type.flags & TypeFlags2.Undefined) !== 0;
}
var no_mixed_message_format_default = createRule({
  name: "no-mixed-message-format",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow a message that mixes builder components with content, embeds, poll, or stickers."
    },
    messages: {
      mixedFormat: "A message cannot mix builder components with content, embeds, poll, or stickers. Discord rejects the payload."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils5.getParserServices(context);
    const checker = services.program.getTypeChecker();
    function spreadHasContent(node) {
      for (const prop of node.properties) {
        if (prop.type !== AST_NODE_TYPES6.SpreadElement) continue;
        const type = services.getTypeAtLocation(prop.argument);
        const carries = CONTENT_FIELDS.some((name) => {
          const symbol = type.getProperty(name);
          if (symbol === void 0 || (symbol.flags & SymbolFlags2.Optional) !== 0) return false;
          return !isDefinitelyUndefined(checker.getTypeOfSymbol(symbol));
        });
        if (carries) return true;
      }
      return false;
    }
    function hasContentField(node) {
      const direct = CONTENT_FIELDS.some((name) => {
        const prop = getProperty(node, name);
        return prop !== void 0 && !isDefinitelyUndefined(services.getTypeAtLocation(prop.value));
      });
      return direct || spreadHasContent(node);
    }
    return {
      ObjectExpression(node) {
        if (hasV2Components(node, services, checker) && hasContentField(node)) {
          context.report({ node, messageId: "mixedFormat" });
        }
      }
    };
  }
});

// src/rules/prefer-ephemeral-flag.ts
import { AST_NODE_TYPES as AST_NODE_TYPES7, ESLintUtils as ESLintUtils6 } from "@typescript-eslint/utils";
var REPLY_METHODS = /* @__PURE__ */ new Set(["reply", "deferReply", "followUp"]);
function propertyName(property) {
  if (property.type !== AST_NODE_TYPES7.Property || property.computed) return void 0;
  if (property.key.type === AST_NODE_TYPES7.Identifier) return property.key.name;
  return typeof property.key.value === "string" ? property.key.value : void 0;
}
function resolveOptions(sourceCode, arg) {
  if (arg?.type === AST_NODE_TYPES7.ObjectExpression) return arg;
  if (arg?.type !== AST_NODE_TYPES7.Identifier) return void 0;
  const init = resolveConstInit(sourceCode, arg);
  return init?.type === AST_NODE_TYPES7.ObjectExpression ? init : void 0;
}
function canReplaceEphemeral(ephemeral, options, messageFlagsAlias) {
  const hasFlags = options.properties.some((property) => propertyName(property) === "flags");
  const hasSpread = options.properties.some((property) => property.type === AST_NODE_TYPES7.SpreadElement);
  const isTrue = ephemeral.value.type === AST_NODE_TYPES7.Literal && ephemeral.value.value === true;
  return messageFlagsAlias !== void 0 && !hasFlags && !hasSpread && isTrue;
}
function destructuredReply(node, sourceCode) {
  if (node.callee.type !== AST_NODE_TYPES7.Identifier) return void 0;
  const calleeId = node.callee;
  const variable = sourceCode.getScope(node).references.find((ref) => ref.identifier === calleeId)?.resolved;
  const def = variable?.defs[0];
  if (def?.node.type !== AST_NODE_TYPES7.VariableDeclarator) return void 0;
  const { id: pattern, init } = def.node;
  if (pattern.type !== AST_NODE_TYPES7.ObjectPattern || !init) return void 0;
  const prop = pattern.properties.find(
    (p) => p.type === AST_NODE_TYPES7.Property && !p.computed && p.key.type === AST_NODE_TYPES7.Identifier && p.value.type === AST_NODE_TYPES7.Identifier && p.value.name === calleeId.name
  );
  if (prop?.key.type !== AST_NODE_TYPES7.Identifier) return void 0;
  return { name: prop.key.name, init };
}
var prefer_ephemeral_flag_default = createRule({
  name: "prefer-ephemeral-flag",
  meta: {
    type: "suggestion",
    fixable: "code",
    docs: {
      description: "Disallow the deprecated ephemeral reply option in favor of MessageFlags.Ephemeral."
    },
    messages: {
      deprecated: "The ephemeral reply option is deprecated. Use flags: MessageFlags.Ephemeral."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils6.getParserServices(context);
    const checker = services.program.getTypeChecker();
    let messageFlagsAlias;
    return {
      ImportDeclaration(node) {
        if (node.source.value !== "discord.js") return;
        for (const spec of node.specifiers) {
          if (spec.type === AST_NODE_TYPES7.ImportSpecifier && spec.imported.type === AST_NODE_TYPES7.Identifier && spec.imported.name === "MessageFlags") {
            messageFlagsAlias = spec.local.name;
          }
        }
      },
      CallExpression(node) {
        let name;
        let receiverType;
        if (node.callee.type === AST_NODE_TYPES7.MemberExpression) {
          name = methodName(node);
          receiverType = services.getTypeAtLocation(node.callee.object);
        } else {
          const reply = destructuredReply(node, context.sourceCode);
          name = reply?.name;
          receiverType = reply ? services.getTypeAtLocation(reply.init) : void 0;
        }
        if (name === void 0 || !REPLY_METHODS.has(name) || receiverType === void 0) return;
        if (!extendsDjsType(checker, receiverType, "BaseInteraction")) return;
        const options = resolveOptions(context.sourceCode, node.arguments[0]);
        if (options === void 0) return;
        const ephemeral = options.properties.find((property) => propertyName(property) === "ephemeral");
        if (ephemeral?.type !== AST_NODE_TYPES7.Property) return;
        const canFix = canReplaceEphemeral(ephemeral, options, messageFlagsAlias);
        context.report({
          node: ephemeral,
          messageId: "deprecated",
          fix: canFix ? (fixer) => fixer.replaceText(ephemeral, `flags: ${messageFlagsAlias}.Ephemeral`) : null
        });
      }
    };
  }
});

// src/rules/prefer-v2-component.ts
import { AST_NODE_TYPES as AST_NODE_TYPES8, ESLintUtils as ESLintUtils7 } from "@typescript-eslint/utils";
var prefer_v2_component_default = createRule({
  name: "prefer-v2-component",
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer a components v2 layout over a legacy embed."
    },
    messages: {
      preferV2: "Prefer a components v2 layout (ContainerBuilder, TextDisplayBuilder) over an embed."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils7.getParserServices(context);
    const checker = services.program.getTypeChecker();
    return {
      NewExpression(node) {
        if (extendsDjsType(checker, services.getTypeAtLocation(node), "EmbedBuilder")) {
          context.report({ node, messageId: "preferV2" });
        }
      },
      // EmbedBuilder.from() is a static factory that returns an embed without `new`
      CallExpression(node) {
        if (node.callee.type !== AST_NODE_TYPES8.MemberExpression) return;
        if (node.callee.property.type !== AST_NODE_TYPES8.Identifier || node.callee.property.name !== "from") {
          return;
        }
        if (extendsDjsType(checker, services.getTypeAtLocation(node.callee.object), "EmbedBuilder")) {
          context.report({ node, messageId: "preferV2" });
        }
      },
      // a seedcord embed component: a class whose .component resolves to EmbedBuilder through its generic
      ClassDeclaration(node) {
        if (!node.superClass || !node.id) return;
        const symbol = services.getSymbolAtLocation(node.id);
        if (!symbol) return;
        const classType = checker.getDeclaredTypeOfSymbol(symbol);
        if (!extendsSeedcordType(checker, classType, "BuilderComponent")) return;
        const component = classType.getProperty("component");
        if (!component) return;
        const componentType = checker.getTypeOfSymbolAtLocation(
          component,
          services.esTreeNodeToTSNodeMap.get(node)
        );
        const componentSymbol = componentType.getSymbol();
        if (componentSymbol?.getName() === "EmbedBuilder" && isFromDiscordJs(componentSymbol)) {
          context.report({ node: node.id, messageId: "preferV2" });
        }
      }
    };
  }
});

// src/rules/require-button-props.ts
import { AST_NODE_TYPES as AST_NODE_TYPES9, ESLintUtils as ESLintUtils8 } from "@typescript-eslint/utils";
function isDjsConsumption(call, arg, info) {
  if (call.callee.type !== AST_NODE_TYPES9.MemberExpression) return false;
  if (!call.arguments.includes(arg)) return false;
  return isFromDiscordJs(info.services.getTypeAtLocation(call.callee.object).getSymbol());
}
function referenceCalls(id, info) {
  const top = enclosingChainTop(id);
  if (top !== id && top.type === AST_NODE_TYPES9.CallExpression) {
    const calls = collectChain(top);
    if (!extendsDjsType(info.checker, info.services.getTypeAtLocation(top), "ButtonBuilder")) return calls;
    const sealed = outermostAssertion(top);
    if (sealed.parent.type === AST_NODE_TYPES9.ExpressionStatement) return calls;
    if (sealed.parent.type === AST_NODE_TYPES9.CallExpression && isDjsConsumption(sealed.parent, sealed, info)) {
      return calls;
    }
    return void 0;
  }
  const wrapped = outermostAssertion(id);
  if (wrapped.parent.type === AST_NODE_TYPES9.CallExpression && isDjsConsumption(wrapped.parent, wrapped, info)) {
    return methodName(wrapped.parent) === "from" ? void 0 : [];
  }
  if (id.parent.type === AST_NODE_TYPES9.ExportSpecifier || id.parent.type === AST_NODE_TYPES9.ExportDefaultDeclaration) {
    return [];
  }
  return void 0;
}
function completionCalls(declarator, info) {
  const variable = info.sourceCode.getDeclaredVariables(declarator)[0];
  if (variable === void 0) return void 0;
  const chains = [];
  for (const ref of variable.references) {
    if (ref.init) continue;
    if (ref.isWrite() || ref.identifier.type !== AST_NODE_TYPES9.Identifier) return void 0;
    const calls = referenceCalls(ref.identifier, info);
    if (calls === void 0) return void 0;
    chains.push(calls);
  }
  return chains.reverse().flat();
}
function reachableCalls(top, info) {
  const calls = top.type === AST_NODE_TYPES9.CallExpression ? collectChain(top) : [];
  const sealed = outermostAssertion(top);
  const parent = sealed.parent;
  if (parent.type === AST_NODE_TYPES9.VariableDeclarator && parent.id.type === AST_NODE_TYPES9.Identifier) {
    const later = completionCalls(parent, info);
    return later === void 0 ? void 0 : [...later, ...calls];
  }
  if (parent.type === AST_NODE_TYPES9.ExpressionStatement) return calls;
  if (parent.type === AST_NODE_TYPES9.CallExpression && isDjsConsumption(parent, sealed, info)) return calls;
  return void 0;
}
var require_button_props_default = createRule({
  name: "require-button-props",
  meta: {
    type: "problem",
    docs: {
      description: "Require every prop the button style must carry before the payload reaches Discord."
    },
    messages: {
      missingStyle: "A button requires a style. Discord rejects one without it.",
      missingUrl: "A Link button requires a url.",
      missingSkuId: "A Premium button requires a skuId.",
      missingCustomId: "A {{style}} button requires a customId.",
      missingLabel: "A {{style}} button requires a label or an emoji."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils8.getParserServices(context);
    const info = { services, checker: services.program.getTypeChecker(), sourceCode: context.sourceCode };
    function reportMissing(anchor, style, facts) {
      const { props } = facts;
      if (style === PREMIUM) {
        if (!props.has("skuId")) context.report({ node: anchor, messageId: "missingSkuId" });
        return;
      }
      if (style === LINK && !props.has("url")) {
        context.report({ node: anchor, messageId: "missingUrl" });
      }
      if (style < LINK && !props.has("customId")) {
        context.report({ node: anchor, messageId: "missingCustomId", data: { style: STYLE_NAMES[style] } });
      }
      if (!props.has("label") && !props.has("emoji")) {
        context.report({ node: anchor, messageId: "missingLabel", data: { style: STYLE_NAMES[style] } });
      }
    }
    return {
      NewExpression(node) {
        const type = services.getTypeAtLocation(node);
        if (!isFromDiscordJs(type.getSymbol()) || !extendsDjsType(info.checker, type, "ButtonBuilder")) return;
        const data = constructorData(node);
        if (node.arguments.length > 0 && data === void 0) return;
        if (data?.properties.some((p) => p.type === AST_NODE_TYPES9.SpreadElement) === true) return;
        const top = enclosingChainTop(node);
        const calls = reachableCalls(top, info);
        if (calls === void 0) return;
        const facts = gatherFacts(calls, data);
        if (facts.styleSource === void 0) {
          context.report({ node: top, messageId: "missingStyle" });
          return;
        }
        const style = knownStyle(staticNumber(facts.styleSource, services));
        if (style === void 0) return;
        reportMissing(top, style, facts);
      }
    };
  }
});

// src/rules/require-components-v2-flag.ts
import { AST_NODE_TYPES as AST_NODE_TYPES10, ESLintUtils as ESLintUtils9 } from "@typescript-eslint/utils";
var IS_COMPONENTS_V2 = 32768;
function combine(states) {
  const [first] = states;
  if (first === void 0) return "unknown";
  return states.every((state) => state === first) ? first : "unknown";
}
function bitState(value) {
  return (value & IS_COMPONENTS_V2) === 0 ? "absent" : "present";
}
function flagTypeState(type) {
  if (type === void 0) return "unknown";
  if (type.isUnion()) return combine(type.types.map(flagTypeState));
  if (type.isNumberLiteral()) return bitState(type.value);
  if (type.isStringLiteral()) {
    if (type.value === "IsComponentsV2") return "present";
    if (/^\d+$/u.test(type.value)) return bitState(Number(type.value));
    return "absent";
  }
  const element = type.getNumberIndexType();
  if (element !== void 0) return flagTypeState(element);
  return "unknown";
}
function applyBitwise(operator, left, right) {
  switch (operator) {
    case "|": {
      return left | right;
    }
    case "&": {
      return left & right;
    }
    case "^": {
      return left ^ right;
    }
    case "<<": {
      return left << right;
    }
    case ">>": {
      return left >> right;
    }
    case ">>>": {
      return left >>> right;
    }
    default: {
      return void 0;
    }
  }
}
function foldToNumber(node, services) {
  switch (node.type) {
    case AST_NODE_TYPES10.Literal: {
      return typeof node.value === "number" ? node.value : void 0;
    }
    case AST_NODE_TYPES10.TSAsExpression: {
      return foldToNumber(node.expression, services);
    }
    case AST_NODE_TYPES10.UnaryExpression: {
      const value = foldToNumber(node.argument, services);
      if (value === void 0) return void 0;
      if (node.operator === "-") return -value;
      if (node.operator === "~") return ~value;
      if (node.operator === "+") return value;
      return void 0;
    }
    case AST_NODE_TYPES10.BinaryExpression: {
      const left = foldToNumber(node.left, services);
      const right = foldToNumber(node.right, services);
      if (left === void 0 || right === void 0) return void 0;
      return applyBitwise(node.operator, left, right);
    }
    case AST_NODE_TYPES10.Identifier:
    case AST_NODE_TYPES10.MemberExpression: {
      const type = services.getTypeAtLocation(node);
      return type.isNumberLiteral() ? type.value : void 0;
    }
    default: {
      return void 0;
    }
  }
}
function elementState(node, services) {
  const folded = foldToNumber(node, services);
  if (folded !== void 0) return bitState(folded);
  return flagTypeState(services.getTypeAtLocation(node));
}
function flagValueState(value, services) {
  if (value.type === AST_NODE_TYPES10.ArrayExpression) {
    const states = new Set(
      value.elements.map((element) => {
        if (element === null) return "absent";
        if (element.type === AST_NODE_TYPES10.SpreadElement) {
          return flagTypeState(services.getTypeAtLocation(element.argument).getNumberIndexType());
        }
        return elementState(element, services);
      })
    );
    if (states.has("present")) return "present";
    return states.has("unknown") ? "unknown" : "absent";
  }
  return elementState(value, services);
}
function flagState(node, services, checker) {
  let state = "absent";
  for (const prop of node.properties) {
    if (prop.type === AST_NODE_TYPES10.Property && propertyKeyIs(prop, "flags")) {
      state = flagValueState(prop.value, services);
    } else if (prop.type === AST_NODE_TYPES10.SpreadElement) {
      const symbol = services.getTypeAtLocation(prop.argument).getProperty("flags");
      if (symbol !== void 0) state = flagTypeState(checker.getTypeOfSymbol(symbol));
    }
  }
  return state;
}
function isMessageOptionsType(type) {
  if (type.isUnion()) return type.types.some(isMessageOptionsType);
  const components = type.getProperty("components");
  const flags = type.getProperty("flags");
  return components !== void 0 && flags !== void 0 && isFromDiscordJs(components) && isFromDiscordJs(flags);
}
var require_components_v2_flag_default = createRule({
  name: "require-components-v2-flag",
  meta: {
    type: "problem",
    docs: {
      description: "Require the IsComponentsV2 flag on a message that uses v2 builder components."
    },
    messages: {
      missingFlag: "A message using v2 builder components must set flags: MessageFlags.IsComponentsV2. Discord rejects the payload otherwise."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils9.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const reportedInits = /* @__PURE__ */ new Set();
    function payloadViolates(node) {
      return hasV2Components(node, services, checker) && flagState(node, services, checker) === "absent";
    }
    function contextualType(node) {
      return checker.getContextualType(services.esTreeNodeToTSNodeMap.get(node));
    }
    return {
      ObjectExpression(node) {
        if (!payloadViolates(node)) return;
        const contextual = contextualType(node);
        if (contextual === void 0 || !isMessageOptionsType(contextual)) return;
        context.report({ node, messageId: "missingFlag" });
      },
      // an unannotated payload has no contextual type until the call site
      CallExpression(node) {
        for (const arg of node.arguments) {
          if (arg.type !== AST_NODE_TYPES10.Identifier) continue;
          const init = resolveConstInit(context.sourceCode, arg);
          if (init?.type !== AST_NODE_TYPES10.ObjectExpression) continue;
          if (contextualType(init) !== void 0) continue;
          if (reportedInits.has(init)) continue;
          const contextual = contextualType(arg);
          if (contextual === void 0 || !isMessageOptionsType(contextual)) continue;
          if (payloadViolates(init)) {
            reportedInits.add(init);
            context.report({ node: init, messageId: "missingFlag" });
          }
        }
      }
    };
  }
});

// src/rules/required-option-before-optional.ts
import { AST_NODE_TYPES as AST_NODE_TYPES11, ESLintUtils as ESLintUtils10 } from "@typescript-eslint/utils";
var SLASH_COMMAND_BUILDERS = /* @__PURE__ */ new Set(["SlashCommandBuilder", "SlashCommandSubcommandBuilder"]);
var ADD_OPTION = /* @__PURE__ */ new Set([
  "addStringOption",
  "addIntegerOption",
  "addBooleanOption",
  "addUserOption",
  "addChannelOption",
  "addRoleOption",
  "addMentionableOption",
  "addNumberOption",
  "addAttachmentOption"
]);
function optionChain(callback) {
  if (callback?.type !== AST_NODE_TYPES11.ArrowFunctionExpression && callback?.type !== AST_NODE_TYPES11.FunctionExpression) {
    return void 0;
  }
  if (callback.body.type !== AST_NODE_TYPES11.BlockStatement) return callback.body;
  for (const statement of callback.body.body) {
    if (statement.type === AST_NODE_TYPES11.ReturnStatement) return statement.argument ?? void 0;
  }
  return void 0;
}
function optionRequiredState(callback, services, checker) {
  const chain = optionChain(callback);
  if (chain?.type !== AST_NODE_TYPES11.CallExpression) return "unknown";
  const setRequired = collectChain(chain).find((call) => methodName(call) === "setRequired");
  if (!setRequired) return "optional";
  const arg = setRequired.arguments[0];
  if (arg?.type === AST_NODE_TYPES11.Literal && typeof arg.value === "boolean") {
    return arg.value ? "required" : "optional";
  }
  if (arg === void 0 || arg.type === AST_NODE_TYPES11.SpreadElement) return "unknown";
  const value = booleanLiteralValue(checker, services.getTypeAtLocation(arg));
  if (value === void 0) return "unknown";
  return value ? "required" : "optional";
}
var required_option_before_optional_default = createRule({
  name: "required-option-before-optional",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow a required slash option after an optional one."
    },
    messages: {
      outOfOrder: "A required slash option cannot come after an optional one."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils10.getParserServices(context);
    const checker = services.program.getTypeChecker();
    return {
      CallExpression(node) {
        if (!isChainTop(node)) return;
        if (!extendsDjsType(checker, services.getTypeAtLocation(chainRoot(node)), SLASH_COMMAND_BUILDERS))
          return;
        const options = collectChain(node).filter((call) => ADD_OPTION.has(methodName(call) ?? "")).reverse().map((call) => ({ call, state: optionRequiredState(call.arguments[0], services, checker) }));
        if (options.length < 2) return;
        if (options.some((option) => option.state === "unknown")) return;
        let seenOptional = false;
        for (const { call, state } of options) {
          if (state === "optional") {
            seenOptional = true;
          } else if (seenOptional) {
            const target = call.callee.type === AST_NODE_TYPES11.MemberExpression ? call.callee.property : call;
            context.report({ node: target, messageId: "outOfOrder" });
            return;
          }
        }
      }
    };
  }
});

// src/rules/select-menu-min-exceeds-max.ts
import { ESLintUtils as ESLintUtils11 } from "@typescript-eslint/utils";
function boundOf(calls, data, method, key, camelKey) {
  const call = lastCall(calls, method);
  if (call !== void 0) return { source: call.arguments[0], site: calleeProperty(call) };
  const prop = data === void 0 ? void 0 : getProperty(data, key) ?? getProperty(data, camelKey);
  if (prop !== void 0) return { source: prop.value, site: prop };
  return void 0;
}
var select_menu_min_exceeds_max_default = createRule({
  name: "select-menu-min-exceeds-max",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow a select menu whose minimum selections exceed its maximum."
    },
    messages: {
      minOverMax: "A minimum of {{min}} selections exceeds the maximum of {{max}}. Discord rejects the select menu."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils11.getParserServices(context);
    const checker = services.program.getTypeChecker();
    function check(calls, root) {
      const rawData = constructorData(root);
      if (boundOf(calls, rawData, "setMinValues", "min_values", "minValues") === void 0) return;
      if (boundOf(calls, rawData, "setMaxValues", "max_values", "maxValues") === void 0) return;
      const rootType = services.getTypeAtLocation(root);
      if (!extendsDjsType(checker, rootType, "BaseSelectMenuBuilder")) return;
      const data = trustedConstructorData(root, rootType);
      const min = boundOf(calls, data, "setMinValues", "min_values", "minValues");
      const max = boundOf(calls, data, "setMaxValues", "max_values", "maxValues");
      if (min === void 0 || max === void 0) return;
      const minValue = staticNumber(min.source, services);
      const maxValue = staticNumber(max.source, services);
      if (minValue === void 0 || maxValue === void 0 || minValue <= maxValue) return;
      context.report({ node: min.site, messageId: "minOverMax", data: { min: minValue, max: maxValue } });
    }
    return {
      CallExpression(node) {
        if (!isChainTop(node)) return;
        check(collectChain(node), chainRoot(node));
      },
      NewExpression(node) {
        if (enclosingChainTop(node) !== node) return;
        check([], node);
      }
    };
  }
});

// src/rules/valid-command-name.ts
import { AST_NODE_TYPES as AST_NODE_TYPES12, ESLintUtils as ESLintUtils12 } from "@typescript-eslint/utils";
var SLASH_BUILDERS = /* @__PURE__ */ new Set([
  "SlashCommandBuilder",
  "SlashCommandSubcommandBuilder",
  "SlashCommandSubcommandGroupBuilder",
  "SlashCommandStringOption",
  "SlashCommandIntegerOption",
  "SlashCommandNumberOption",
  "SlashCommandBooleanOption",
  "SlashCommandUserOption",
  "SlashCommandChannelOption",
  "SlashCommandRoleOption",
  "SlashCommandMentionableOption",
  "SlashCommandAttachmentOption"
]);
function isValidChatInputName(name) {
  return /^[\p{Ll}\p{Lm}\p{Lo}\p{N}\p{sc=Devanagari}\p{sc=Thai}_-]{1,32}$/u.test(name);
}
function staticName(arg) {
  if (arg.type === AST_NODE_TYPES12.Literal && typeof arg.value === "string") return arg.value;
  if (arg.type === AST_NODE_TYPES12.TemplateLiteral && arg.expressions.length === 0) {
    return arg.quasis[0]?.value.cooked ?? void 0;
  }
  return void 0;
}
var valid_command_name_default = createRule({
  name: "valid-command-name",
  meta: {
    type: "problem",
    docs: {
      description: "Enforce Discord chat-input name rules on slash command and option names."
    },
    messages: {
      invalidName: "This name is not a valid chat-input name. Use lowercase letters, digits, hyphens, or underscores, 1 to 32 characters."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils12.getParserServices(context);
    return {
      CallExpression(node) {
        if (methodName(node) !== "setName") return;
        const arg = node.arguments[0];
        if (arg === void 0) return;
        let name = staticName(arg);
        if (name === void 0 && (arg.type === AST_NODE_TYPES12.Identifier || arg.type === AST_NODE_TYPES12.MemberExpression)) {
          const argType = services.getTypeAtLocation(arg);
          if (argType.isStringLiteral()) name = argType.value;
        }
        if (name === void 0 || isValidChatInputName(name)) return;
        if (node.callee.type !== AST_NODE_TYPES12.MemberExpression) return;
        const checker = services.program.getTypeChecker();
        const receiverType = services.getTypeAtLocation(node.callee.object);
        if (!extendsDjsType(checker, receiverType, SLASH_BUILDERS)) return;
        context.report({ node: arg, messageId: "invalidName" });
      }
    };
  }
});

// src/rules/valid-command-description.ts
import { AST_NODE_TYPES as AST_NODE_TYPES13, ESLintUtils as ESLintUtils13 } from "@typescript-eslint/utils";
var SLASH_BUILDERS2 = /* @__PURE__ */ new Set([
  "SlashCommandBuilder",
  "SlashCommandSubcommandBuilder",
  "SlashCommandSubcommandGroupBuilder",
  "SlashCommandStringOption",
  "SlashCommandIntegerOption",
  "SlashCommandNumberOption",
  "SlashCommandBooleanOption",
  "SlashCommandUserOption",
  "SlashCommandChannelOption",
  "SlashCommandRoleOption",
  "SlashCommandMentionableOption",
  "SlashCommandAttachmentOption"
]);
function staticString(arg) {
  if (arg.type === AST_NODE_TYPES13.Literal && typeof arg.value === "string") return arg.value;
  if (arg.type === AST_NODE_TYPES13.TemplateLiteral && arg.expressions.length === 0) {
    return arg.quasis[0]?.value.cooked ?? void 0;
  }
  return void 0;
}
var valid_command_description_default = createRule({
  name: "valid-command-description",
  meta: {
    type: "problem",
    docs: {
      description: "Enforce Discord description length limits (1\u2013100 characters) on slash commands and options."
    },
    messages: {
      tooLong: "Command and option descriptions must be 100 characters or fewer. Discord rejects descriptions exceeding 100 characters (current length: {{length}}).",
      empty: "Command and option descriptions cannot be empty."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils13.getParserServices(context);
    return {
      CallExpression(node) {
        if (methodName(node) !== "setDescription") return;
        const arg = node.arguments[0];
        if (arg === void 0) return;
        let desc = staticString(arg);
        if (desc === void 0 && (arg.type === AST_NODE_TYPES13.Identifier || arg.type === AST_NODE_TYPES13.MemberExpression)) {
          const argType = services.getTypeAtLocation(arg);
          if (argType.isStringLiteral()) desc = argType.value;
        }
        if (desc === void 0) return;
        if (node.callee.type !== AST_NODE_TYPES13.MemberExpression) return;
        const checker = services.program.getTypeChecker();
        const receiverType = services.getTypeAtLocation(node.callee.object);
        if (!extendsDjsType(checker, receiverType, SLASH_BUILDERS2)) return;
        if (desc.length === 0) {
          context.report({ node: arg, messageId: "empty" });
        } else if (desc.length > 100) {
          context.report({ node: arg, messageId: "tooLong", data: { length: desc.length } });
        }
      }
    };
  }
});

// src/rules/valid-label-length.ts
import { AST_NODE_TYPES as AST_NODE_TYPES14, ESLintUtils as ESLintUtils14 } from "@typescript-eslint/utils";
function staticString2(arg) {
  if (arg.type === AST_NODE_TYPES14.Literal && typeof arg.value === "string") return arg.value;
  if (arg.type === AST_NODE_TYPES14.TemplateLiteral && arg.expressions.length === 0) {
    return arg.quasis[0]?.value.cooked ?? void 0;
  }
  return void 0;
}
var valid_label_length_default = createRule({
  name: "valid-label-length",
  meta: {
    type: "problem",
    docs: {
      description: "Enforce Discord LabelBuilder label length limits (1\u201345 characters)."
    },
    messages: {
      tooLong: "LabelBuilder label must be 45 characters or fewer. Discord rejects labels exceeding 45 characters (current length: {{length}}). Put longer text in setDescription().",
      empty: "Label text cannot be empty."
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils14.getParserServices(context);
    return {
      CallExpression(node) {
        if (methodName(node) !== "setLabel") return;
        const arg = node.arguments[0];
        if (arg === void 0) return;
        let label = staticString2(arg);
        if (label === void 0 && (arg.type === AST_NODE_TYPES14.Identifier || arg.type === AST_NODE_TYPES14.MemberExpression)) {
          const argType = services.getTypeAtLocation(arg);
          if (argType.isStringLiteral()) label = argType.value;
        }
        if (label === void 0) return;
        if (node.callee.type !== AST_NODE_TYPES14.MemberExpression) return;
        const checker = services.program.getTypeChecker();
        const receiverType = services.getTypeAtLocation(node.callee.object);
        if (!extendsDjsType(checker, receiverType, "LabelBuilder")) return;
        if (label.length === 0) {
          context.report({ node: arg, messageId: "empty" });
        } else if (label.length > 45) {
          context.report({ node: arg, messageId: "tooLong", data: { length: label.length } });
        }
      }
    };
  }
});

// src/index.ts
import * as tseslintParser from "@typescript-eslint/parser";
var rules = {
  "no-choices-and-autocomplete": no_choices_and_autocomplete_default,
  "no-conflicting-button-props": no_conflicting_button_props_default,
  "no-discord-limit-exceeded": no_discord_limit_exceeded_default,
  "no-mixed-message-format": no_mixed_message_format_default,
  "prefer-ephemeral-flag": prefer_ephemeral_flag_default,
  "prefer-v2-component": prefer_v2_component_default,
  "require-button-props": require_button_props_default,
  "require-components-v2-flag": require_components_v2_flag_default,
  "required-option-before-optional": required_option_before_optional_default,
  "select-menu-min-exceeds-max": select_menu_min_exceeds_max_default,
  "valid-command-name": valid_command_name_default,
  "valid-command-description": valid_command_description_default,
  "valid-label-length": valid_label_length_default
};
var plugin = {
  meta: { name: "@vybe-bot/eslint-plugin-discord", version: "1.0.0" },
  rules
};
var WARN_RULES = /* @__PURE__ */ new Set(["prefer-ephemeral-flag", "prefer-v2-component"]);
var presetRules = {};
for (const name of Object.keys(rules)) {
  presetRules[`@vybe-bot/discord/${name}`] = WARN_RULES.has(name) ? "warn" : "error";
}
var recommended = [
  {
    files: ["**/*.ts", "**/*.mts", "**/*.cts", "**/*.tsx"],
    plugins: {
      "@vybe-bot/discord": plugin,
      discord: plugin
    },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        projectService: true
      }
    },
    rules: presetRules
  }
];
plugin.configs = { recommended };
var index_default = plugin;
export {
  index_default as default,
  recommended
};
//# sourceMappingURL=index.js.map