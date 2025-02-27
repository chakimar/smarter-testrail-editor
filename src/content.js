import React from 'react'
import * as ReactDOM from 'react-dom'
import Editor from './Editor'

const extEditorId = id => `smarter-testrail-editor-${id}`

const replaceEditor = target => {
    const root = document.createElement('div')
    target.parentNode.prepend(root)

    // set original editor styles
    target.style.setProperty('display', 'none')
    target.style.setProperty('white-space', 'pre', 'important')
    document
        .querySelectorAll('.icon-markdown-table')
        .forEach(element => element.parentElement.style.setProperty('display', 'none'))

    // replace image element with text
    Array.from(target.childNodes.values())
        .filter(node => node.nodeName === 'DIV')
        .filter(node => node.classList.contains('attachment-list-item'))
        .filter(node => node.hasAttribute('data-attachment-id'))
        .map(node => [node, node.getAttribute('data-attachment-id')])
        .map(([node, attachmentId]) => [node, `index.php?/attachments/get/${attachmentId}`])
        .map(([node, attachmentUrl]) => [node, `![](${attachmentUrl})`])
        .map(([node, markdownLink]) => [node, document.createTextNode(markdownLink)])
        .forEach(([node, newNode]) => node.parentNode.replaceChild(newNode, node))

    // remove nodes other than text and blank text nodes
    Array.from(target.childNodes.values())
        .filter(node => node.nodeName !== '#text' || node.nodeValue.trim().length === 0)
        .forEach(node => node.parentNode.removeChild(node))

    // register event dispatcher of image adding
    new MutationObserver(entries => {
        entries
            .map(entry => [...entry.addedNodes.values()])
            .reduce((a, v) => a.concat(v), [])
            .filter(node => node.nodeName === 'DIV')
            .filter(node => node.classList.contains('attachment-list-item'))
            .filter(node => node.hasAttribute('data-attachment-id'))
            .map(node => node.getAttribute('data-attachment-id'))
            .map(attachmentId => `index.php?/attachments/get/${attachmentId}`)
            .map(
                attachmentUrl =>
                    new CustomEvent('image-add', {
                        bubbles: true,
                        cancelable: true,
                        detail: {
                            attachmentUrl,
                        },
                    })
            )
            .forEach(imagesAddEvent => target.dispatchEvent(imagesAddEvent))
    }).observe(target, {
        attributes: false,
        childList: true,
        subtree: true,
    })

    // replace original editor with extension editor
    ReactDOM.render(<Editor target={target} id={extEditorId(target.id)} />, root)

    return target
}

let editors = new Map()

let updateEditors = editors =>
    new Map(
        Array.from(document.querySelectorAll('.field-editor'))
            .map(element => (editors.get(element.id) ? element : replaceEditor(element)))
            .map(element => [element.id, document.getElementById(extEditorId(element.id))])
    )

editors = updateEditors(editors)

new MutationObserver(() => {
    editors = updateEditors(editors)
}).observe(document.body, {
    attributes: false,
    childList: true,
    subtree: true,
})
