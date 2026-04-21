const Content = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => {
  return (
    <>
      <div className="flex flex-col col-span-2 lg:col-span-1">
        <h2 className="text-sm text-gray-700 font-semibold">{title}</h2>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
      <div className="justify-self-end w-full col-span-2 lg:col-span-1">
        {children}
      </div>
    </>
  );
};

export default Content;
