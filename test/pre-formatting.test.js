import { describe, it, expect } from 'vitest'
import * as csstree from 'css-tree'

import nonMatchingMediaQueryRemover from '../src/non-matching-media-query-remover.js'

function testMediaQueryRemoval (tests, width, height, keepLargerMediaQueries) {
  return [].concat(...tests.map(({rules, remove}) => {
    return rules.map(ruleCss => {
      const ast = csstree.parse(ruleCss)
      const matchingRules = nonMatchingMediaQueryRemover(
        ast,
        width,
        height,
        keepLargerMediaQueries
      ).children.toArray()

      if (remove && matchingRules.length) {
        return `❌ media query should have been removed: \n${ruleCss}`
      } else if (!remove && !matchingRules.length) {
        return `❌ media query should have been kept: \n${ruleCss}`
      }
    }).filter(Boolean)
  }))
}

process.setMaxListeners(0)

describe('penthouse pre formatting tests', () => {
  it('should remove non matching media queries', () => {
    // 1300, 1600
    const mediaToAlwaysKeep = [
      `@media all {}`,
      // going for false positives over false negatives
      `@media oiasjdoiasd {}`,
      // covering combined queries
      `@media (min-width: 320px) and (max-width: 400px) {}`,
      `@media (min-width: 150px) and (max-width: 1700px) {}`,
      `@media not screen and (min-width: 1800px) {}`,
      `@media not all and (min-width: 101em) {}`
    ]
    // 1300, 1600
    const mediaToRemoveAlways = [
      `@media print {}`,
      `@media not screen {}`,
      `@media not (min-width: 1px) {}`,
      `@media not screen and (min-width: 800px) {}`,
      `@media not all and (min-width: 50em) {}`
    ]
    // 1600
    const mediaToRemoveUnlessLarge = [
      `@media (min-width: 1500px) {}`,
      `@media screen and (min-width: 93.75em) {}`,
      `@media screen and (min-width: 93.75rem) {}`,
      // covering combined queries
      `@media (min-width: 1500px) and (max-width: 1700px) {}`,
      `@media screen and (min-width: 1500px) and (max-width: 1800px) {}`
    ]
    const mediaToRemoveUnlessKeepLarge = [
      `@media (min-width: 99999px) {}`,
      // covering combined queries
      `@media (min-width: 1800px) and (max-width: 2800px) {}`
    ]

    // test default settings
    const defaultTest = [
      {
        rules: [
          ...mediaToRemoveAlways,
          ...mediaToRemoveUnlessLarge,
          ...mediaToRemoveUnlessKeepLarge
        ],
        remove: true
      },
      {
        rules: mediaToAlwaysKeep,
        remove: false
      }
    ]
    const defaultErrors = testMediaQueryRemoval(defaultTest, 1300, 900)
    if (defaultErrors.length) {
      throw new Error('defaultErrors:\n' + defaultErrors.join('\n'))
    }

    // test larger screen size settings
    const largeTest = [
      {
        rules: [
          ...mediaToRemoveAlways,
          ...mediaToRemoveUnlessKeepLarge
        ],
        remove: true
      },
      {
        rules: [...mediaToRemoveUnlessLarge, ...mediaToAlwaysKeep],
        remove: false
      }
    ]
    const largeErrors = testMediaQueryRemoval(largeTest, 1600, 1200)
    if (largeErrors.length) {
      throw new Error('largeErrors:\n' + largeErrors.join('\n'))
    }

    // test keepLargeMediaQueries - to be moved
    const keepLargeMediaQueriesTest = [
      {
        rules: mediaToRemoveAlways,
        remove: true
      },
      {
        rules: [...mediaToRemoveUnlessLarge, ...mediaToRemoveUnlessKeepLarge, ...mediaToAlwaysKeep],
        remove: false
      }
    ]
    let keepLargeMediaQueriesErrors = testMediaQueryRemoval(keepLargeMediaQueriesTest, 1300, 900, true)
    if (keepLargeMediaQueriesErrors.length) {
      throw new Error('keepLargeMediaQueriesErrors:\n' + keepLargeMediaQueriesErrors.join('\n'))
    }
  })
})
