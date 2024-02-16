export function buildRootIndexFile(indexFileMap): string {
    const exportArray = [] as string[]

    for (const pathname in indexFileMap) {
        indexFileMap[pathname].forEach((component) => {
            const componentPath = `${pathname}${component}`
            exportArray.push(`export * from './components${componentPath}.tsx'`)
        })
    }

    return exportArray.join('\n')
}
