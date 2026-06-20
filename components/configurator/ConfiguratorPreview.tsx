'use client'
import Image from 'next/image'
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
        <Image
          src={baseImg}
          alt={`${base} in ${baseColor}`}
          fill
          className={styles.previewLayer}
          unoptimized
          priority
        />
      )}
      {shadeImg && (
        <Image
          src={shadeImg}
          alt={`${shade} in ${shadeColor}`}
          fill
          className={styles.previewLayer}
          unoptimized
          priority
        />
      )}
    </div>
  )
}
