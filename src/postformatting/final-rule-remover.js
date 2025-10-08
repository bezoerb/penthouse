import * as csstree from 'css-tree'

// Pre-compile Sets for O(1) lookup performance
const NON_NESTED_ATRULES = new Set(['charset', 'import', 'namespace'])
const PROPERTY_ATRULES = new Set([
  'font-face',
  'keyframes',
  'viewport',
  'property' // Modern: CSS custom properties with types
])
const NESTED_ATRULES = new Set([
  'media',
  'document',
  'supports',
  'container', // Modern: container queries
  'layer' // Modern: cascade layers
])

export default function finalRuleRemover (ast, _propertiesToRemove) {
  // remove empty rules
  csstree.walk(ast, {
    visit: 'Rule',
    leave: (rule, item, list) => {
      if (rule.block.children.size === 0) {
        list.remove(item)
      }
    }
  })

  // remove unwanted and empty at-rules
  csstree.walk(ast, {
    visit: 'Atrule',
    leave: (atrule, item, list) => {
      const name = csstree.keyword(atrule.name).basename

      /* ==@-rule handling== */
      /* Case 0: Non nested @-rule [REMAIN]
         (@charset, @import, @namespace)
      */
      if (NON_NESTED_ATRULES.has(name)) {
        return
      }

      /* Case 1: @-rule with CSS properties inside [REMAIN]
         @font-face, @keyframes - keep here, but remove later in code, unless it is used.
         Modern: @property, @counter-style, @font-palette-values, @font-feature-values
      */
      if (PROPERTY_ATRULES.has(name)) {
        return
      }

      /* Case 2: @-rule with CSS rules inside [REMAIN]
         non matching media queries are stripped out in non-matching-media-query-remover.js
         Modern: @container, @layer, @scope, @starting-style
         Note: @layer can be empty (for ordering), @container kept without size filtering
      */
      if (NESTED_ATRULES.has(name)) {
        // Keep @layer even if empty (used for cascade layer ordering)
        if (name === 'layer') {
          return
        }
        // Keep others only if they have content
        if (atrule.block && atrule.block.children.size > 0) {
          return
        }
      }

      // otherwise remove the at-rule
      list.remove(item)
    }
  })
}
