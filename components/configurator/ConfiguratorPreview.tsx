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

export function ConfiguratorPreview({ base, baseColor, shade, shadeColor, baseAlt, shadeAlt }: ConfiguratorPreviewProps) {
  const baseImg = base && baseColor ? `/assets/bases/${base.replace(/ /g, '%20')}-${baseColor}.webp` : null
  const shadeImg = shade && shadeColor ? `/assets/shades/${shade.replace(/ /g, '%20')}-${shadeColor}.webp` : null
  const hasContent = !!(baseImg || shadeImg)

  return (
    <div className={[styles.preview, hasContent ? styles.hasLamp : ''].join(' ')}>
      {baseImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={baseImg}
          alt={baseAlt}
          className={styles.previewBase}
        />
      )}
      {shadeImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shadeImg}
          alt={shadeAlt}
          className={styles.previewShade}
        />
      )}
    </div>
  )
}
