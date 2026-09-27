import "./globals.css";
export const metadata = { title: "TaskFlow", description: "Personal task and income manager" };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="en"><body>{children}</body></html>;
}
