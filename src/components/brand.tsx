import Image from "next/image";
import logo from "../../assets/brand/iguana-garage-logo-horizontal.png";
export function Brand() { return <Image src={logo} alt="Iguana Garage" className="brand" priority unoptimized />; }
