import * as csstree from 'css-tree'

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
      /* - Case 0 : Non nested @-rule [REMAIN]
         (@charset, @import, @namespace)
      */
      if (name === 'charset' || name === 'import' || name === 'namespace') {
        return
      }

      /* Case 1: @-rule with CSS properties inside [REMAIN]
         @font-face, @keyframes - keep here, but remove later in code, unless it is used.
         Modern: @property, @counter-style, @font-palette-values, @font-feature-values
      */
      if (
        name === 'font-face' ||
        name === 'keyframes' ||
        name === 'viewport' ||
        name === 'property' ||
        name === 'counter-style' ||
        name === 'font-palette-values' ||
        name === 'font-feature-values'
      ) {
        return
      }

      /* Case 3: @-rule with CSS rules inside [REMAIN] */
      // non matching media queries are stripped out in non-matching-media-query-remover.js
      // Modern: @container, @layer, @scope, @starting-style
      // Note: @layer can be empty (for ordering), @container kept without size filtering
      if (
        name === 'media' ||
        name === 'document' ||
        name === 'supports' ||
        name === 'container' ||
        name === 'layer' ||
        name === 'scope' ||
        name === 'starting-style'
      ) {
        // Keep @layer even if empty (used for cascade layer ordering)
        if (name === 'layer') {
          return
        }
        // Keep others only if they have content
        if (atrule.block && atrule.block.children.size > 0) {
          return
        }
      }

      /* Case 4: Vendor-prefixed @-rules [REMAIN]
         Keep vendor-prefixed at-rules (e.g., @-webkit-keyframes, @-moz-document)
      */
      const atRuleName = atrule.name
      if (
        atRuleName.startsWith('-webkit-') ||
        atRuleName.startsWith('-moz-') ||
        atRuleName.startsWith('-ms-') ||
        atRuleName.startsWith('-o-')
      ) {
        return
      }

      // otherwise remove the at-rule
      list.remove(item)
    }
  })
}
