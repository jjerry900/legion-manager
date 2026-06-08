interface Props {
  title: string;
  value: string;
}

export default function StatCard(props: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-zinc-400">
        {props.title}
      </p>

      <h2 className="text-3xl font-bold mt-2 text-yellow-500">
        {props.value}
      </h2>
    </div>
  );
}