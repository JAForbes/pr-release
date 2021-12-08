import path from 'path'
import fs from 'fs/promises'
import crypto from 'crypto'
import { $ } from 'zx'
import * as marked from 'marked'
import * as linkedom from 'linkedom'
import fm from 'front-matter'

async function main(){

    let xs = (await $`find docs -name "*.md"`).stdout.trim().split('\n')
    
    let metadata = await fs.readFile('.pr-release/metadata', 'utf8')
    
    xs = xs.map( async filepath => {
        let md = await fs.readFile(filepath, 'utf8')
        let { attributes={}, body } = fm(md)

        let templateHTML = await fs.readFile('./scripts/index.html', 'utf8')
        let {document, window } = linkedom.parseHTML(templateHTML);

        'Update template with page content'; {
            // let h1 = document.getElementById('main-header')
            let title = document.getElementsByTagName('title')
            let content = document.getElementById('content')
    
            content.innerHTML = marked.marked(body)
            title.innerHTML = attributes.title
            // h1.innerHTML = attributes.title
        }

        'make pr-release metadata available to scripts'; {
            let $ = document.createElement('script')
            $.innerHTML = `window.prr = ${metadata};`
            document.body.appendChild($)
        }

        let url = '/' + filepath.replace('docs/', '').replace('.md', '').replace('index', '')

        fm()

        return {
            filepath
            , url
            , document
            , window
            , attributes
        }
    })

    xs = await Promise.all(xs)

    await fs
        .rm('web-dist', { recursive: true, force: true })
        .catch( () => null )
    
    await fs.mkdir('web-dist')
    let css = await fs.readFile('./scripts/style.css', 'utf8')

    xs.map( async ({ filepath, document }) => {
        let htmlPath = 
            filepath
            .replace('docs/', 'web-dist/')
            .replace('.md', '/index.html')
            .replace('index/index', 'index')

        let link = document.createElement('link')
        link.setAttribute('rel', 'stylesheet')
        link.setAttribute('href', '/style.css?hash='+ crypto.createHash('sha256').update(css).digest('hex'))
        document.head.appendChild(link)
        let html = document.body.parentNode.outerHTML
        await fs.mkdir(path.dirname(htmlPath), { recursive: true, force: true })
        await fs.writeFile('./web-dist/style.css', css)
        await fs.writeFile(htmlPath, html)
    })
    xs = Promise.all(xs)
}

main()
// console.log(marked.marked(`hello`))