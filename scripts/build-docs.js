import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { $ } from 'zx'
import * as marked from 'marked'
import * as linkedom from 'linkedom'
import fm from 'front-matter'
import sanitizeHTML from 'sanitize-html'

marked.use({
    renderer: {
        heading(text, level, _, slugger) {
            const slug = slugger.slug(text)
            return `<h${level} id="${slug}"><a name="${slug}" href="#${slug}">${text}</a></h${level}>`
        }
    }
})

async function main(){

    let xs = (await $`find docs -name "*.md"`).stdout.trim().split('\n')
    
    let metadata = await fs.readFile('.pr-release/metadata', 'utf8')
    
    xs = xs.map( async filepath => {
        let md = await fs.readFile(filepath, 'utf8')
        let { attributes={}, body } = fm(md)

        let templateHTML = await fs.readFile('./scripts/index.html', 'utf8')
        let {document, window } = linkedom.parseHTML(templateHTML);
        let scripts = {};

        'Update template with page content'; {
            // let h1 = document.getElementById('main-header')
            let title = document.getElementsByTagName('title')
            let content = document.getElementById('content')
    
            let contentHeader = document.getElementById('content-title')
            let contentDescription = document.getElementById('content-description')
            content.innerHTML = marked.marked(body)
            title.innerHTML = attributes.title
            // h1.innerHTML = attributes.title

            if( attributes.title ) {
                contentHeader.innerHTML = attributes.title
            }

            if( attributes.description ) {
                contentDescription.innerHTML = attributes.description
            }
        }

        'make pr-release metadata available to scripts'; {
            scripts['./data.js'] = 
            `window.prr = ${metadata}; window.frontMatter = ${JSON.stringify(attributes)};`
        }

        'highlight anchor'; {
            scripts['./highlight-anchor.js'] = `
                for( let el of document.querySelectorAll('a') ) {
                    if (el.href == window.location.href) {
                        el.classList.add('current')
                    }
                }
            `
        }

        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode
                .insertBefore(newNode, referenceNode.nextSibling);
        }

        'execute bash code blocks and inject output into page'; 
        if ( attributes.executeCodeBlocks ) {
            for( let block of document.querySelectorAll('code.language-bash') ) {
                
                let output = await $([block.innerHTML])
                let resultBlock = document.createElement('pre')
                let codeResultBlock = document.createElement('code')

                resultBlock.classList.add("result")
                codeResultBlock.innerHTML = sanitizeHTML(output+'');
                resultBlock.appendChild(codeResultBlock);
                insertAfter(resultBlock, block)
            }
        }
        

        let url = '/' + filepath.replace('docs/', '').replace('.md', '').replace('index', '')

        return {
            filepath
            , url
            , document
            , window
            , attributes
            , scripts
        }
    })

    xs = await Promise.all(xs)

    await fs
        .rm('web-dist', { recursive: true, force: true })
        .catch( () => null )
    
    await fs.mkdir('web-dist').catch( () => {})
    let css = await fs.readFile('./scripts/style.css', 'utf8')

    xs.map( async ({ filepath, document, scripts }) => {
        
        let htmlPath = 
            filepath
            .replace('docs/', 'web-dist/')
            .replace('.md', '/index.html')
            .replace('index/index', 'index')

        let link = document.createElement('link')
        link.setAttribute('rel', 'stylesheet')
        link.setAttribute('href', '/style.css?hash='+ crypto.createHash('sha256').update(css).digest('hex'))
        document.head.appendChild(link)
        
        await fs.mkdir(path.dirname(htmlPath), { recursive: true, force: true })

        for( let [scriptPath, content] of Object.entries(scripts) ) {
            let resolvedPath = path.resolve(path.dirname(htmlPath), scriptPath)

            await fs.writeFile(resolvedPath, content, 'utf8');
            
            let $ = document.createElement('script')
            $.setAttribute('src', scriptPath)
            document.body.appendChild($)
        }

        let html = document.body.parentNode.outerHTML
        
        await fs.writeFile('./web-dist/style.css', css)
        await fs.writeFile(htmlPath, html)

        
    })
    xs = await Promise.all(xs)
    await $`cp -r ./scripts/assets ./web-dist/`
}

main()
