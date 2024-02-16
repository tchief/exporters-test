import { Supernova, PulsarContext, RemoteVersionIdentifier, AnyOutputFile, AssetFormat, RenderedAsset, Asset } from "@supernovaio/sdk-exporters"
import { ExporterConfiguration } from "../config"
import { convertRenderedAssetsToComponentsInBatches, convertRenderedAssetsToOriginalSVG, convertRenderedAssetsToIndexFile } from "./files"
import { isPathFilteredOut } from "./paths"
import { FileHelper } from "@supernovaio/export-helpers"
import { svgAssetToReact } from "./svg"
import { buildRootIndexFile } from "./utils"

/**
 * Export entrypoint.
 * When running `export` through extensions or pipelines, this function will be called.
 * Context contains information about the design system and version that is currently being exported.
 */
Pulsar.export(async (sdk: Supernova, context: PulsarContext): Promise<Array<AnyOutputFile>> => {
  // Fetch data from design system that is currently being exported (context)
  const remoteVersionIdentifier: RemoteVersionIdentifier = {
    designSystemId: context.dsId,
    versionId: context.versionId,
  }

  // Fetch the necessary data
  let assets = await sdk.assets.getAssets(remoteVersionIdentifier)
  let assetGroups = await sdk.assets.getAssetGroups(remoteVersionIdentifier)

  // Filter by brand, if specified by the VSCode extension or pipeline configuration
  if (context.brandId) {
    const brands = await sdk.brands.getBrands(remoteVersionIdentifier)
    const brand = brands.find(
      (brand) =>
        brand?.id === context?.brandId ||
        brand?.idInVersion === context?.brandId,
    )
    if (!brand) {
      throw new Error(`Unable to find brand ${context.brandId}.`)
    }

    assets = assets.filter((asset) => asset?.brandId === brand?.id)
  }

  // DO NOT Render all assets in the library
  let renderedAssets = assets;
  // await sdk.assets.getRenderedAssets(
  //   remoteVersionIdentifier,
  //   assets,
  //   assetGroups,
  //   AssetFormat.svg,
  //   exportConfiguration.svgScale
  // )

  let resultingFiles: Array<AnyOutputFile> = []

  // Filter out assets that don't belong to the selected platform
  // if (exportConfiguration.ignoredAssetPaths.length > 0) {
  //   renderedAssets = renderedAssets.filter(
  //     (a) => !isPathFilteredOut(exportConfiguration.ignoredAssetPaths, [...a.group.path, a.group.name])
  //   )
  // }

  // Filter for Icons
  const icons = renderedAssets.map((asset) => {
    if (asset.origin?.name?.includes('Icons')) {
      return asset
    }
  })

  // Create Icon SVG File Options Array
  const iconsFileOptionsArray: {
    relativePath: string
    fileName: string
    url: string
  }[] = []

  // Create Icon TSX File Options Array
  const iconComponentFileOptionsArray: {
    relativePath: string
    fileName: string
    content: string
  }[] = []

  const indexFileMap = {}

  icons?.forEach((icon: Asset) => {
    if (icon?.svgUrl) {
      const originName = icon?.origin?.name?.split('/') || []
      const pathname = originName
        .map((name, index) => {
          if (index === 0 || index === originName.length - 1) {
            return ''
          } else {
            return name
          }
        })
        .join('/')
        .replaceAll(' ', '')
        .replaceAll('-', '')

      const iconName = icon?.name
        .replaceAll('-', '')
        .replaceAll(' ', '')
        .replaceAll('&', 'And')
        .replaceAll('%', 'Percent')
        .replaceAll('(', '')
        .replaceAll(')', '')

      // Build SVG Files
      const SVGFileName = `${iconName}.svg`
      iconsFileOptionsArray.push({
        relativePath: `./svgs/${pathname}`,
        fileName: SVGFileName,
        url: icon?.svgUrl,
      })

      // Build TSX Files
      const TSXFileName = `${iconName}.tsx`
      iconComponentFileOptionsArray.push({
        relativePath: `./components/${pathname}`,
        fileName: TSXFileName,
        content: svgAssetToReact(iconName, pathname),
      })

      if (pathname in indexFileMap) {
        indexFileMap[pathname].push(iconName)
      } else {
        indexFileMap[pathname] = [iconName]
      }
    }
  })

  const iconSVGFiles = [
    ...iconsFileOptionsArray.map((fileOptions) =>
      FileHelper.createCopyRemoteFile(fileOptions),
    ),
  ]

  const iconReactFiles = [
    ...iconComponentFileOptionsArray.map((fileOptions) =>
      FileHelper.createTextFile(fileOptions),
    ),
  ]

  const indexExportFiles = [
    FileHelper.createTextFile({
      relativePath: './',
      fileName: 'index.ts',
      content: buildRootIndexFile(indexFileMap),
    }),
  ]

  // Create output file and return it
  return [...iconSVGFiles, ...iconReactFiles, ...indexExportFiles]

  // // Generate React components
  // const components = await convertRenderedAssetsToComponentsInBatches(renderedAssets, sdk, exportConfiguration)
  // resultingFiles = [...resultingFiles, ...components]

  // // Add SVG definitions to the output if enabled
  // if (exportConfiguration.keepOriginalSvgs) {
  //   const svgs = await convertRenderedAssetsToOriginalSVG(renderedAssets, exportConfiguration)
  //   resultingFiles = [...resultingFiles, ...svgs]
  // }

  // // Add index file to the output if enabled
  // if (exportConfiguration.generateIndex) {
  //   const indexFile = await convertRenderedAssetsToIndexFile(renderedAssets, exportConfiguration)
  //   resultingFiles.push(indexFile)
  // }

  // return resultingFiles
})

/** Exporter configuration. Adheres to the `ExporterConfiguration` interface and its content comes from the resolved default configuration + user overrides of various configuration keys */
export const exportConfiguration = Pulsar.exportConfig<ExporterConfiguration>()
