import MapPage from '../MapPage'

interface Props {
  params: Promise<{ stopId: string }>
}

export default async function StopRoute({ params }: Props) {
  const { stopId } = await params
  return <MapPage initialStopId={stopId} />
}
