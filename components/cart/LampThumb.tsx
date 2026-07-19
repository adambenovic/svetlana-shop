'use client'
import { useState } from 'react'
import styles from './LampThumb.module.css'

/** Composite thumbnail of a configured lamp — layers the base render under the
 *  shade render, same as the configurator preview. */
export function LampThumb({ imageUrl, baseImageUrl, alt }: {
  imageUrl?: string
  baseImageUrl?: string
  alt: string
}) {
  const [failed, setFailed] = useState(false)
  if (!imageUrl || failed) return <div className={styles.placeholder} />
  return (
    <div className={styles.thumb}>
      {baseImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={baseImageUrl} alt="" aria-hidden className={styles.layer} onError={() => setFailed(true)} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={alt} className={styles.layer} onError={() => setFailed(true)} />
    </div>
  )
}
