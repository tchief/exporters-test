import { exportConfiguration } from "."
import { optimize } from "svgo"

export function optimizeSVG(svg: string): string {
  // Run SVGO to optimize the content of the SVG
  let optimizedSVG = exportConfiguration.optimize ? optimize(svg, exportConfiguration.svgoOptions).data : svg

  // If provided, replace all values in the SVG for the ones provided in the configuration. Useful to change hard-coded colors to stuff like "currentColor" and similar
  if (Object.keys(exportConfiguration.replaceValues).length > 0) {
    for (let [key, value] of Object.entries(exportConfiguration.replaceValues)) {
      optimizedSVG = optimizedSVG.replaceAll(key, value)
    }
  }

  return optimizedSVG
}

export function svgAssetToReact(iconName: string, pathname: string): string {
  const generateAssetPath = (pathname: string, iconName: string) => {
    let dirStructure = '../'
    const pathArray = pathname.slice(1, pathname.length - 1).split('/')
    for (let i = 0; i < pathArray.length; i++) {
      dirStructure = dirStructure.concat('../')
    }
    return `import SVGFile from '${dirStructure}svgs${pathname}${iconName}.svg'\n`
  }

  const sizeMap = {
    '12x12': 'Mini',
    '24x24': 'Small',
    '36x36': 'Medium',
    '48x48': 'Large',
  }

  const reactImport = "import React, { FC, SVGProps } from 'react'\n"
  const SVGAsset = generateAssetPath(pathname, iconName)

  const pathArray = pathname
    .slice(1, pathname.length - 1)
    .split('/')
    .reverse()
    .map((path) => {
      for (const size in sizeMap) {
        if (path.includes(size)) {
          return path.replace(size, sizeMap[size])
        }
      }
      return path
    })
    .join('')

  const reactComponent = `
  type AcornsIconProps = {
    monospace?: boolean;
  } & SVGProps<SVGElement>;
  
  const ${iconName}${pathArray}Icon: FC<AcornsIconProps> = ({
    height,
    width,
    monospace,
    ...otherProps
  }) => {
    let finalWidth = width;
    let finalHeight = height;
  
    if (monospace) {
      if (height) {
        finalWidth = height;
      } else if (width) {
        finalHeight = width;
      }
    }
  
    const Icon = SVGFile
  
    return <Icon height={finalHeight} width={finalWidth} {...otherProps} />;
  };
  
  export { ${iconName}${pathArray}Icon };
  `

  return reactImport + SVGAsset + reactComponent
}
