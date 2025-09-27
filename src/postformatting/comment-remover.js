export default function commentRemover (ast) {
  // remove top level comments only (like the original implementation)
  ast.children.each((node, item, list) => {
    if (node.type === 'Comment') {
      list.remove(item)
    }
  })
}
