import path from 'path'
import fs from 'fs/promises'
import { $ } from 'zx'
import * as marked from 'marked'
import * as linkedom from 'linkedom'
import fm from 'front-matter'

const wrappedHTML = ({ content='', title=''}) =>
`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body>
    <header>
        <h1>${title}</h1>
        <nav>
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="/about/">About</a></li>
                <li><a href="/blog/">Blog</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <article>
        ${content}
        </article>
    </main>
    <footer>
        <p>Copyright © 2006 The Example Company</p>
        <p><a href="about.html">About</a> -
        <a href="policy.html">Privacy Policy</a> -
        <a href="contact.html">Contact Us</a></p
    </footer>
</body>
</html>`

async function main(){

    let xs = (await $`find docs -name "*.md"`).stdout.trim().split('\n')
    
    xs = xs.map( async filepath => {
        let md = await fs.readFile(filepath, 'utf8')
        let { attributes={}, body } = fm(md)


        let html = wrappedHTML({
            title: attributes.title
            ,content: marked.marked(body)
        })

        
        let { document, window } = linkedom.parseHTML(html)
        
        let url = '/' + filepath.replace('docs/', '').replace('.md', '').replace('index', '')

        fm()

        return {
            filepath
            , html
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
    let cssInnerText = await fs.readFile('./scripts/style.css', 'utf8')

    xs.map( async ({ filepath, html, document }) => {
        let htmlPath = 
            filepath
            .replace('docs/', 'web-dist/')
            .replace('.md', '/index.html')
            .replace('index/index', 'index')

        let style = document.createElement('style')
        style.innerText = cssInnerText
        document.head.appendChild(style)
        
        html = document.body.parentNode.outerHTML
        await fs.mkdir(path.dirname(htmlPath), { recursive: true, force: true })
        await fs.writeFile(htmlPath, html)
    })
    xs = Promise.all(xs)
}

main()
// console.log(marked.marked(`hello`))