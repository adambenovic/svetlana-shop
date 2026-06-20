'use client'
import styles from './Configurator.module.css'

interface ConfiguratorPreviewProps {
  base: string
  baseColor: string
  shade: string
  shadeColor: string
}

export function ConfiguratorPreview({ base, baseColor, shade, shadeColor }: ConfiguratorPreviewProps) {
  const baseImg = base && baseColor ? `/assets/bases/${base}-${baseColor}.webp` : null
  const shadeImg = shade && shadeColor ? `/assets/shades/${shade}-${shadeColor}.webp` : null
  const hasContent = !!(baseImg || shadeImg)

  return (
    <div className={[styles.preview, hasContent ? styles.hasLamp : ''].join(' ')}>
      {baseImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={baseImg}
          alt={`${base} in ${baseColor}`}
          className={styles.previewBase}
        />
      )}
      {shadeImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shadeImg}
          alt={`${shade} in ${shadeColor}`}
          className={styles.previewShade}
        />
      )}
    </div>
  )
}
