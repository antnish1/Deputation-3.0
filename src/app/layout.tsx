import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Frontier | Deputation 3.0',description:'Daily service deputation, consolidation and attendance'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
