from pathlib import Path
path = Path('apps/frontend/src/components/listings/listing-detail-client.tsx')
text = path.read_text(encoding='utf-8-sig')
if 'import clsx from "clsx";' not in text:
    marker = 'import { useCallback, useEffect, useMemo, useState } from "react";\n'
    replacement = marker + 'import clsx from "clsx";\n'
    if marker in text:
        text = text.replace(marker, replacement, 1)
main_image_old = '<Image unoptimized src={heroImages[0]} alt={${listing.title} ??????? ????} fill className="object-cover transition duration-300 hover:scale-105" />'
main_image_new = '''<Image\n                unoptimized\n                src={heroImages[0]}\n                alt={`${listing.title} Ч главное фото`}\n                fill\n                className="object-cover transition duration-300 hover:scale-105"\n                priority\n              />'''
text = text.replace(main_image_old, main_image_new)
slice_old = '''{heroImages.slice(1, 3).map((image, index) => (\n              <button\n                type="button"\n                key={}\n                onClick={() => openLightbox(index + 1)}\n                className="relative overflow-hidden rounded-3xl focus:outline-none"\n              >\n                <Image unoptimized src={image}\n                  alt={}\n                  fill\n                  className="object-cover transition duration-300 hover:scale-105"\n                />\n              </button>\n            ))}\n          </div>'''
slice_new = '''{heroImages.slice(1, 3).map((image, index) => (\n              <button\n                type="button"\n                key={`${listing.id}-hero-${index + 1}`}\n                onClick={() => openLightbox(index + 1)}\n                className="relative overflow-hidden rounded-3xl focus:outline-none"\n              >\n                <Image\n                  unoptimized\n                  src={image}\n                  alt={`${listing.title} Ч фото ${index + 2}`}\n                  fill\n                  className="object-cover transition duration-300 hover:scale-105"\n                />\n              </button>\n            ))}\n          </div>'''
text = text.replace(slice_old, slice_new)
lightbox_main_old = '''<Image unoptimized src={heroImages[activeImageIndex]}\n                alt={}\n                fill\n                sizes="100vw"\n                className="rounded-3xl object-contain"\n                priority\n              />'''
lightbox_main_new = '''<Image\n                unoptimized\n                src={heroImages[activeImageIndex]}\n                alt={`${listing.title} Ч фото ${activeImageIndex + 1}`}\n                fill\n                sizes="100vw"\n                className="rounded-3xl object-contain"\n                priority\n              />'''
text = text.replace(lightbox_main_old, lightbox_main_new)
thumb_old = '''{heroImages.map((image, index) => (\n              <button\n                type="button"\n                key={}\n                onClick={() => setActiveImageIndex(index)}\n                className={}\n              >\n                <Image unoptimized src={image} alt={} fill className="object-cover" />\n              </button>\n            ))}\n          </div>'''
thumb_new = '''{heroImages.map((image, index) => (\n              <button\n                type="button"\n                key={`${listing.id}-lightbox-${index}`}\n                onClick={() => setActiveImageIndex(index)}\n                className={clsx(\n                  "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl focus:outline-none transition",\n                  activeImageIndex === index\n                    ? "ring-2 ring-white ring-offset-2 ring-offset-black/40"\n                    : "opacity-70 hover:opacity-100"\n                )}\n              >\n                <Image\n                  unoptimized\n                  src={image}\n                  alt={`${listing.title} Ч фото ${index + 1}`}\n                  fill\n                  className="object-cover"\n                />\n              </button>\n            ))}\n          </div>'''
text = text.replace(thumb_old, thumb_new)
text = text.replace('>\n            ?\n          </button>', '>\n            ?\n          </button>')
path.write_text(text, encoding='utf-8-sig')
