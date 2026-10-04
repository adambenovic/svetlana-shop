'use client'
import styles from './Configurator.module.css'

interface ConfiguratorPreviewProps {
  base: string
  baseColor: string
  shade: string
  shadeColor: string
  /** Localized, descriptive alt text (built by the parent, which has the names). */
  baseAlt: string
  shadeAlt: string
}

/** Full 1200×1600 render of a base / shade in a colour (null when either is unset). */
export function baseRenderSrc(base: string, baseColor: string): string | null {
  return base && baseColor ? `/assets/bases/${base.replace(/ /g, '%20')}-${baseColor}.webp` : null
}

export function shadeRenderSrc(shade: string, shadeColor: string): string | null {
  return shade && shadeColor ? `/assets/shades/${shade.replace(/ /g, '%20')}-${shadeColor}.webp` : null
}

export function ConfiguratorPreview({ base, baseColor, shade, shadeColor, baseAlt, shadeAlt }: ConfiguratorPreviewProps) {
  const baseImg = baseRenderSrc(base, baseColor)
  const shadeImg = shadeRenderSrc(shade, shadeColor)
  const hasContent = !!(baseImg || shadeImg)

  // The two layers are the page's LCP element — fetch them ahead of everything
  // else (the parent also preloads the initial pair from <head>).
  return (
    <div className={[styles.preview, hasContent ? styles.hasLamp : ''].join(' ')}>
      {baseImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={baseImg}
          alt={baseAlt}
          width={1200}
          height={1600}
          fetchPriority="high"
          className={styles.previewBase}
        />
      )}
      {shadeImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shadeImg}
          alt={shadeAlt}
          width={1200}
          height={1600}
          fetchPriority="high"
          className={styles.previewShade}
        />
      )}
    </div>
  )
}
